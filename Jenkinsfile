pipeline {
  agent any

  parameters {
    choice(name: 'RUN_MODE', choices: ['Run now', 'Schedule'], description: 'Run immediately or schedule for later')
    choice(name: 'SCHEDULE_TYPE', choices: ['Once', 'Everyday', 'Weekly'], description: 'Applicable only if RUN_MODE = Schedule')
    string(name: 'ONCE_DATE', defaultValue: '', description: 'Once: yyyy-MM-dd')
    string(name: 'ONCE_TIME', defaultValue: '', description: 'Once: HH:mm (24hr)')
    string(name: 'DAILY_TIME', defaultValue: '', description: 'Everyday: HH:mm (24hr)')
    string(name: 'WEEK_DAYS', defaultValue: '', description: 'Weekly: e.g. MON,TUE')
    string(name: 'WEEK_TIME', defaultValue: '', description: 'Weekly: HH:mm (24hr)')

    booleanParam(name: 'RUN_ALL', defaultValue: false, description: 'Run all flows')

    // ✅ all flow checkboxes
    booleanParam(name: 'install_adb',                defaultValue: false, description: '')
    booleanParam(name: 'install_play',               defaultValue: false, description: '')
    booleanParam(name: 'aggregation_check',          defaultValue: false, description: '')
    booleanParam(name: 'tnd_check',                  defaultValue: false, description: '')
    booleanParam(name: 'collection_mode_all',        defaultValue: false, description: '')
    booleanParam(name: 'collection_mode_trusted',    defaultValue: false, description: '')
    booleanParam(name: 'collection_mode_untrusted',  defaultValue: false, description: '')
    booleanParam(name: 'interface_info',             defaultValue: false, description: '')
    booleanParam(name: 'ipfix_disable',              defaultValue: false, description: '')
    booleanParam(name: 'ipfix_zero',                 defaultValue: false, description: '')
    booleanParam(name: 'parent_process_check',       defaultValue: false, description: '')
    booleanParam(name: 'template_caching_untrusted', defaultValue: false, description: '')
    booleanParam(name: 'before_after_reboot',        defaultValue: false, description: '')
    booleanParam(name: 'aup_should_displayed',       defaultValue: false, description: '')
    booleanParam(name: 'aup_should_not_displayed',   defaultValue: false, description: '')
    booleanParam(name: 'eula_not_accepted',          defaultValue: false, description: '')
    booleanParam(name: 'negatives',                  defaultValue: false, description: '')

    string(name: 'EMAILS', defaultValue: '', description: 'Recipients (comma separated)')
  }

  environment {
    NODE_HOME = "C:\\Program Files\\nodejs"
    PATH = "${env.NODE_HOME};${env.PATH}"
  }

  options { timestamps() }

  stages {

    // ============ Stage 1: Schedule or Run Now ==============
    stage('Decide Run Mode') {
      steps {
        script {
          if (params.RUN_MODE == 'Schedule') {
            echo "🕒 Scheduling mode selected (${params.SCHEDULE_TYPE})..."

            def scheduleTimeMillis = null

            if (params.SCHEDULE_TYPE == 'Once') {
              if (!params.ONCE_DATE?.trim() || !params.ONCE_TIME?.trim()) {
                error "For Once schedule, please provide ONCE_DATE (yyyy-MM-dd) and ONCE_TIME (HH:mm)."
              }
              def sdf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm")
              def parsed = sdf.parse("${params.ONCE_DATE.trim()} ${params.ONCE_TIME.trim()}")
              scheduleTimeMillis = parsed.time
            }
            else if (params.SCHEDULE_TYPE == 'Everyday') {
              if (!params.DAILY_TIME?.trim()) error "Please provide DAILY_TIME (HH:mm)."
              def now = java.util.Calendar.getInstance()
              def t = params.DAILY_TIME.trim().split(":")
              def target = now.clone()
              target.set(java.util.Calendar.HOUR_OF_DAY, t[0].toInteger())
              target.set(java.util.Calendar.MINUTE, t[1].toInteger())
              target.set(java.util.Calendar.SECOND, 0)
              if (target.before(now)) target.add(java.util.Calendar.DATE, 1)
              scheduleTimeMillis = target.timeInMillis
            }
            else if (params.SCHEDULE_TYPE == 'Weekly') {
              if (!params.WEEK_DAYS?.trim() || !params.WEEK_TIME?.trim()) {
                error "Please provide WEEK_DAYS (e.g. MON,TUE) and WEEK_TIME (HH:mm)."
              }
              def dayMap = ['SUN':1,'MON':2,'TUE':3,'WED':4,'THU':5,'FRI':6,'SAT':7]
              def now = java.util.Calendar.getInstance()
              def t = params.WEEK_TIME.trim().split(":")
              def nextRun = null
              for (d in params.WEEK_DAYS.split(",")) {
                def dd = d.trim().toUpperCase()
                if (!dayMap.containsKey(dd)) continue
                def c = now.clone()
                c.set(java.util.Calendar.DAY_OF_WEEK, dayMap[dd])
                c.set(java.util.Calendar.HOUR_OF_DAY, t[0].toInteger())
                c.set(java.util.Calendar.MINUTE, t[1].toInteger())
                c.set(java.util.Calendar.SECOND, 0)
                if (c.before(now)) c.add(java.util.Calendar.WEEK_OF_YEAR, 1)
                if (nextRun == null || c.timeInMillis < nextRun.timeInMillis) nextRun = c
              }
              scheduleTimeMillis = nextRun.timeInMillis
            }

            long delaySeconds = (scheduleTimeMillis - System.currentTimeMillis()) / 1000
            if (delaySeconds < 0) delaySeconds = 0

            echo "⏳ Build will be scheduled in ${delaySeconds} seconds (${new Date(scheduleTimeMillis)})"
            echo "🟢 Current build will exit — next build will trigger automatically at the scheduled time."

            // Use PowerShell to delay and trigger a new build exactly once
            bat """
              powershell -Command "Start-Sleep -Seconds ${delaySeconds}; `
              Invoke-RestMethod -Uri 'http://localhost:8080/job/${env.JOB_NAME}/buildWithParameters' `
              -Method Post `
              -Headers @{Authorization=('Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes('admin:admin')))} `
              -Body @{
                RUN_MODE='Run now'
                RUN_ALL='${params.RUN_ALL}'
                aggregation_check='${params.aggregation_check}'
                tnd_check='${params.tnd_check}'
                EMAILS='${params.EMAILS}'
              }"
            """

            currentBuild.result = 'SUCCESS'
            error("🟡 Scheduling complete — pipeline exiting.")
          } else {
            echo "🚀 Run now selected — executing immediately."
          }
        }
      }
    }

    // ============ Stage 2: Agent Sanity Check ==============
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

    // ============ Stage 3: Clean Outputs ==============
    stage('Clean outputs') {
      steps {
        bat '''
          if exist allure-results rmdir /s /q allure-results
          if exist allure-report rmdir /s /q allure-report
          if exist allure-report.single.html del /f /q allure-report.single.html
        '''
      }
    }

    // ============ Stage 4: Install Dependencies ==============
    stage('Install deps') {
      steps {
        bat '''
          call node -v
          if errorlevel 1 ( echo Node not found & exit /b 1 )
          call npm ci
          if errorlevel 1 exit /b 1
        '''
      }
    }

    // ============ Stage 5: Select Flows ==============
    stage('Select flows') {
      steps {
        script {
          def all = [
            'install_adb','install_play','aggregation_check','tnd_check',
            'collection_mode_all','collection_mode_trusted','collection_mode_untrusted',
            'interface_info','ipfix_disable','ipfix_zero','parent_process_check',
            'template_caching_untrusted','before_after_reboot',
            'aup_should_displayed','aup_should_not_displayed','eula_not_accepted',
            'negatives'
          ]
          def chosen = params.RUN_ALL ? all : all.findAll { params[it] }
          if (!chosen) error 'No flows selected — pick at least one or enable RUN_ALL'
          env.CHOSEN = chosen.join(',')
          echo "Flows selected: ${env.CHOSEN}"
        }
      }
    }

    // ============ Stage 6: Run flows ==============
    stage('Run flows (sequential)') {
      steps {
        script {
          def FLOW = [
            install_adb: 'Install via ADB',
            install_play: 'Install via Play Store',
            aggregation_check: 'Aggregation Check',
            tnd_check: 'TND Check',
            collection_mode_all: 'Collection Mode - All',
            collection_mode_trusted: 'Collection Mode - Trusted',
            collection_mode_untrusted: 'Collection Mode - Untrusted',
            interface_info: 'Interface Info',
            ipfix_disable: 'IPFIX Disable',
            ipfix_zero: 'IPFIX Zero',
            parent_process_check: 'Parent Process Check',
            template_caching_untrusted: 'Template Caching - Untrusted',
            before_after_reboot: 'Before/After Reboot',
            aup_should_displayed: 'AUP Should Display',
            aup_should_not_displayed: 'AUP Should NOT Display',
            eula_not_accepted: 'EULA Not Accepted',
            negatives: 'Negatives'
          ]

          def results = []

          for (suite in env.CHOSEN.split(',')) {
            def flow = FLOW.get(suite, suite)
            echo "=== RUNNING ${suite} [FLOW=${flow}] ==="
            int code = bat(returnStatus: true, script: "npx wdio run wdio.conf.ts --suite ${suite}")
            def status = (code == 0) ? 'SUCCESS' : 'FAILURE'
            results << [name: flow, status: status]
          }

          writeFile file: 'suite_results.txt', text: results.collect { "${it.name}|${it.status}" }.join('\n')
        }
      }
    }

    // ============ Stage 7: Generate Allure ==============
    stage('Generate Allure') {
      steps {
        bat '''
          echo ==== Generate Allure ====
          if not exist allure-results (
            echo No allure-results found
            exit /b 1
          )
          npx allure generate --clean allure-results -o allure-report
        '''
      }
    }

    // ============ Stage 8: Publish Allure ==============
    stage('Publish Allure (Jenkins link)') {
      steps {
        script {
          if (fileExists('allure-results')) {
            allure(results: [[path: 'allure-results']])
            echo 'Published Allure results to Jenkins.'
          } else {
            echo 'No allure-results to publish.'
          }
        }
      }
    }

    // ============ Stage 9: Build Single HTML ==============
    stage('Make single-file HTML (no server)') {
      steps {
        bat '''
          echo ==== Build single HTML ====
          if not exist tools\\pack-allure-onehtml.js (
            echo Missing tools\\pack-allure-onehtml.js
            exit /b 1
          )
          if not exist allure-report\\index.html (
            echo Missing allure-report\\index.html
            exit /b 1
          )
          node tools\\pack-allure-onehtml.js allure-report
          if not exist allure-report\\allure-report.offline.html (
            echo Single HTML not created
            exit /b 1
          )
          copy /y "allure-report\\allure-report.offline.html" "allure-report.single.html" >nul
          echo Created: allure-report.single.html
        '''
      }
    }

    // ============ Stage 10: Email & Archive ==============
    stage('Publish & Email') {
      steps {
        script {
          archiveArtifacts artifacts: 'allure-results/**, allure-report/**, tools/**, allure-report.single.html, suite_results.txt', fingerprint: true

          def recipients = (params.EMAILS ?: '').trim()
          if (recipients) {

            def perSuiteHtml = ''
            if (fileExists('suite_results.txt')) {
              def lines = readFile('suite_results.txt').trim().split(/\r?\n/)
              def rows = lines.collect { l ->
                def p = l.split('\\|', 2)
                def color = (p[1] == 'SUCCESS') ? '#16a34a' : '#dc2626'
                "<tr><td style='padding:6px 10px;border:1px solid #e5e7eb;'>${p[0]}</td><td style='padding:6px 10px;border:1px solid #e5e7eb;font-weight:700;color:${color};'>${p[1]}</td></tr>"
              }.join('\n')

              perSuiteHtml = """
                <p><strong>Per-suite results:</strong></p>
                <table style='border-collapse:collapse;font-family:Segoe UI,Arial,sans-serif;font-size:13px'>
                  <tr><th style='padding:8px 10px;border:1px solid #e5e7eb;background:#f3f4f6;'>Test</th>
                      <th style='padding:8px 10px;border:1px solid #e5e7eb;background:#f3f4f6;'>Result</th></tr>
                  ${rows}
                </table>
              """
            }

            def status = currentBuild.currentResult
            def color = (status == 'SUCCESS') ? '#16a34a' : '#dc2626'

            emailext(
              to: recipients,
              subject: "Mobile Sanity Build #${env.BUILD_NUMBER} — ${status}",
              mimeType: 'text/html',
              body: """<html><body style='font-family:Segoe UI,Arial;font-size:14px;color:#111827;'>
                <p>Hi Team,</p>
                <p>This is an automated Mobile Automation build update.</p>
                <p><strong>Status:</strong> <span style='color:${color};font-weight:700;'>${status}</span></p>
                <p><strong>Executed On:</strong> ${new Date().format("yyyy-MM-dd HH:mm:ss")}<br/>
                   <strong>Duration:</strong> ${currentBuild.durationString.replace(' and counting','')}</p>
                <p><strong>Executed Test Cases:</strong></p>
                <pre style='background:#f8fafc;border:1px solid #e5e7eb;padding:8px;border-radius:6px;white-space:pre-wrap;margin:0;'>
${params.RUN_ALL ? 'All test cases executed (RUN_ALL selected)' :
    (params.collect { k,v -> v && !['RUN_ALL','EMAILS'].contains(k) ? " - ${k}" : null }.findAll { it }.join('\n'))}
                </pre>
                ${perSuiteHtml}
                <p style='margin-top:12px;'>Attached: <em>allure-report.single.html</em>.</p>
              </body></html>""",
              attachmentsPattern: 'allure-report.single.html'
            )
          } else {
            echo 'EMAILS empty — skipping email.'
          }
        }
      }
    }
  }
}
