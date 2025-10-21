pipeline {
  agent any

  parameters {
    choice(name: 'RUN_MODE', choices: ['Run now', 'Schedule'], description: 'Run immediately or schedule for later')
    choice(name: 'SCHEDULE_TYPE', choices: ['Once', 'Everyday', 'Weekly'], description: 'Used only when RUN_MODE = Schedule')
    string(name: 'ONCE_DATE', defaultValue: '', description: 'Once: yyyy-MM-dd')
    string(name: 'ONCE_TIME', defaultValue: '', description: 'Once: HH:mm (24hr)')
    string(name: 'DAILY_TIME', defaultValue: '', description: 'Everyday: HH:mm (24hr)')
    string(name: 'WEEK_DAYS', defaultValue: '', description: 'Weekly: e.g. MON,TUE')
    string(name: 'WEEK_TIME', defaultValue: '', description: 'Weekly: HH:mm (24hr)')

    booleanParam(name: 'RUN_ALL', defaultValue: false, description: 'Run all flows')
    booleanParam(name: 'aggregation_check', defaultValue: false, description: 'Aggregation check')
    booleanParam(name: 'tnd_check', defaultValue: false, description: 'TND check')
    string(name: 'EMAILS', defaultValue: '', description: 'Recipients (comma separated)')
  }

  environment {
    NODE_HOME = "C:\\Program Files\\nodejs"
    PATH = "${env.NODE_HOME};${env.PATH}"
  }

  options { timestamps() }

  stages {

    /* ========== Decide Run Mode ========== */
    stage('Decide Run Mode') {
      steps {
        script {
          if (params.RUN_MODE == 'Schedule') {
            echo "🕒 Scheduling mode selected (${params.SCHEDULE_TYPE})..."

            def scheduleTimeMillis = null
            def now = java.util.Calendar.getInstance()

            if (params.SCHEDULE_TYPE == 'Once') {
              if (!params.ONCE_DATE?.trim() || !params.ONCE_TIME?.trim())
                error "Provide ONCE_DATE (yyyy-MM-dd) and ONCE_TIME (HH:mm)."
              def sdf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm")
              scheduleTimeMillis = sdf.parse("${params.ONCE_DATE.trim()} ${params.ONCE_TIME.trim()}").time
            } else if (params.SCHEDULE_TYPE == 'Everyday') {
              if (!params.DAILY_TIME?.trim()) error "Provide DAILY_TIME (HH:mm)."
              def t = params.DAILY_TIME.split(":")
              def cal = now.clone()
              cal.set(java.util.Calendar.HOUR_OF_DAY, t[0].toInteger())
              cal.set(java.util.Calendar.MINUTE, t[1].toInteger())
              cal.set(java.util.Calendar.SECOND, 0)
              if (cal.before(now)) cal.add(java.util.Calendar.DATE, 1)
              scheduleTimeMillis = cal.timeInMillis
            } else if (params.SCHEDULE_TYPE == 'Weekly') {
              if (!params.WEEK_DAYS?.trim() || !params.WEEK_TIME?.trim())
                error "Provide WEEK_DAYS (e.g. MON,TUE) and WEEK_TIME (HH:mm)."
              def dayMap = ['SUN':1,'MON':2,'TUE':3,'WED':4,'THU':5,'FRI':6,'SAT':7]
              def t = params.WEEK_TIME.split(":")
              def nextRun = null
              for (d in params.WEEK_DAYS.split(",")) {
                def dd = d.trim().toUpperCase()
                if (!dayMap[dd]) continue
                def cal = now.clone()
                cal.set(java.util.Calendar.DAY_OF_WEEK, dayMap[dd])
                cal.set(java.util.Calendar.HOUR_OF_DAY, t[0].toInteger())
                cal.set(java.util.Calendar.MINUTE, t[1].toInteger())
                cal.set(java.util.Calendar.SECOND, 0)
                if (cal.before(now)) cal.add(java.util.Calendar.WEEK_OF_YEAR, 1)
                if (nextRun == null || cal.timeInMillis < nextRun.timeInMillis) nextRun = cal
              }
              scheduleTimeMillis = nextRun.timeInMillis
            }

            long delaySeconds = (scheduleTimeMillis - System.currentTimeMillis()) / 1000
            if (delaySeconds < 0) delaySeconds = 0
            def runAt = new Date(scheduleTimeMillis)
            echo "⏳ Build will be scheduled in ${delaySeconds} seconds (${runAt})"
            echo "🟢 Current build will exit — next build will trigger automatically at scheduled time."

            // ✅ PowerShell-based delayed trigger
            bat """
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$delay = ${delaySeconds}; ^
   Start-Sleep -Seconds $delay; ^
   Invoke-RestMethod -Uri 'http://localhost:8080/job/${env.JOB_NAME}/buildWithParameters' `
     -Method Post `
     -Headers @{Authorization=('Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes('admin:admin')))} `
     -Body @{RUN_MODE='Run now'; RUN_ALL='${params.RUN_ALL}'; aggregation_check='${params.aggregation_check}'; tnd_check='${params.tnd_check}'; EMAILS='${params.EMAILS}'}"
"""
            currentBuild.result = 'SUCCESS'
            error("🟡 Scheduling complete — pipeline exiting.")
          } else {
            echo "🚀 Run now selected — executing immediately."
          }
        }
      }
    }

    /* ========== Agent Check ========== */
    stage('Agent sanity') {
      steps {
        bat '''
          echo ===== Agent sanity =====
          where node
          node -v
          where npm
          npm -v
        '''
      }
    }

    /* ========== Clean & Install ========== */
    stage('Clean outputs') {
      steps {
        bat '''
          if exist allure-results rmdir /s /q allure-results
          if exist allure-report rmdir /s /q allure-report
          if exist allure-report.single.html del /f /q allure-report.single.html
        '''
      }
    }

    stage('Install deps') {
      steps {
        bat '''
          call node -v
          if errorlevel 1 (echo Node missing & exit /b 1)
          call npm ci
        '''
      }
    }

    /* ========== Run Flow ========== */
    stage('Select & Run flows') {
      steps {
        script {
          def chosen = []
          if (params.RUN_ALL) chosen = ['aggregation_check','tnd_check']
          else {
            if (params.aggregation_check) chosen << 'aggregation_check'
            if (params.tnd_check) chosen << 'tnd_check'
          }
          if (!chosen) error "No flows selected — enable RUN_ALL or check one."

          for (s in chosen) {
            echo "Running suite: ${s}"
            int code = bat(returnStatus: true, script: "npx wdio run wdio.conf.ts --suite ${s}")
            if (code != 0) currentBuild.result = 'FAILURE'
          }
        }
      }
    }

    /* ========== Allure & Email ========== */
    stage('Generate Allure') {
      steps {
        bat '''
          if not exist allure-results (echo Missing allure-results & exit /b 1)
          npx allure generate --clean allure-results -o allure-report
        '''
      }
    }

    stage('Email & Archive') {
      steps {
        script {
          archiveArtifacts artifacts: 'allure-report/**,allure-results/**,allure-report.single.html', fingerprint: true
          def recipients = (params.EMAILS ?: '').trim()
          if (recipients) {
            emailext(
              to: recipients,
              subject: "Mobile Automation Build #${env.BUILD_NUMBER} - ${currentBuild.currentResult}",
              mimeType: 'text/html',
              body: """
              <html><body style='font-family:Segoe UI'>
              <h3>Build #${env.BUILD_NUMBER} : ${currentBuild.currentResult}</h3>
              <p>Executed on: ${new Date().format("yyyy-MM-dd HH:mm:ss")}</p>
              <p>Attached: Allure single HTML report.</p>
              </body></html>""",
              attachmentsPattern: 'allure-report.single.html'
            )
          } else {
            echo 'No email recipients configured.'
          }
        }
      }
    }
  }
}
