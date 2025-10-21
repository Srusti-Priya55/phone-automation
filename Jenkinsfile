pipeline {
  agent any

  parameters {
    choice(name: 'RUN_MODE', choices: ['Run now', 'Schedule'], description: 'Run immediately or schedule')
    choice(name: 'SCHEDULE_TYPE', choices: ['Once', 'Everyday', 'Weekly'], description: 'If Schedule selected')
    string(name: 'ONCE_DATE', defaultValue: '', description: 'Once: date (YYYY-MM-DD)')
    string(name: 'ONCE_TIME', defaultValue: '', description: 'Once: time (HH:mm 24h)')
    string(name: 'EVERY_TIME', defaultValue: '', description: 'Everyday: time (HH:mm 24h)')
    string(name: 'WEEK_DAYS', defaultValue: '', description: 'Weekly: Mon,Tue,Wed,Thu,Fri,Sat,Sun')
    string(name: 'WEEK_TIME', defaultValue: '', description: 'Weekly: time (HH:mm 24h)')

    booleanParam(name: 'RUN_ALL', defaultValue: false, description: 'Run all flows')
    booleanParam(name: 'install_adb', defaultValue: false, description: '')
    booleanParam(name: 'install_play', defaultValue: false, description: '')
    booleanParam(name: 'aggregation_check', defaultValue: false, description: '')
    booleanParam(name: 'tnd_check', defaultValue: false, description: '')
    booleanParam(name: 'collection_mode_all', defaultValue: false, description: '')
    booleanParam(name: 'collection_mode_trusted', defaultValue: false, description: '')
    booleanParam(name: 'collection_mode_untrusted', defaultValue: false, description: '')
    booleanParam(name: 'interface_info', defaultValue: false, description: '')
    booleanParam(name: 'ipfix_disable', defaultValue: false, description: '')
    booleanParam(name: 'ipfix_zero', defaultValue: false, description: '')
    booleanParam(name: 'parent_process_check', defaultValue: false, description: '')
    booleanParam(name: 'template_caching_untrusted', defaultValue: false, description: '')
    booleanParam(name: 'before_after_reboot', defaultValue: false, description: '')
    booleanParam(name: 'aup_should_displayed', defaultValue: false, description: '')
    booleanParam(name: 'aup_should_not_displayed', defaultValue: false, description: '')
    booleanParam(name: 'eula_not_accepted', defaultValue: false, description: '')
    booleanParam(name: 'negatives', defaultValue: false, description: '')
    string(name: 'EMAILS', defaultValue: '', description: 'Recipients (comma-separated)')
  }

  environment {
    NODE_HOME = "C:\\Program Files\\nodejs"
    PATH = "${env.NODE_HOME};${env.PATH}"
  }

  options { timestamps() }

  stages {

    stage('Schedule or Run') {
      steps {
        script {
          def causes = currentBuild.getBuildCauses()
          def isUpstream = causes.any { it._class?.contains("UpstreamCause") }

          if (params.RUN_MODE == 'Schedule' && !isUpstream) {
            def now = new Date()
            def sdf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm")
            def buildParams = currentBuild.rawBuild.getAction(hudson.model.ParametersAction).parameters

            if (params.SCHEDULE_TYPE == 'Once') {
              if (!params.ONCE_DATE || !params.ONCE_TIME)
                error "Please provide ONCE_DATE and ONCE_TIME"

              def target = sdf.parse("${params.ONCE_DATE} ${params.ONCE_TIME}")
              def delaySeconds = ((target.time - now.time) / 1000).intValue()
              if (delaySeconds < 60) delaySeconds = 60

              echo "⏱ One-time schedule: running after ${delaySeconds} seconds (${target})"
              build job: env.JOB_NAME, wait: false, parameters: buildParams, quietPeriod: delaySeconds
              currentBuild.result = 'SUCCESS'
              return
            }

            else if (params.SCHEDULE_TYPE == 'Everyday') {
              if (!params.EVERY_TIME) error "Please provide EVERY_TIME"
              def parts = params.EVERY_TIME.tokenize(':')
              def hh = parts[0].toInteger()
              def mm = parts[1].toInteger()

              def cal = Calendar.getInstance()
              cal.set(Calendar.HOUR_OF_DAY, hh)
              cal.set(Calendar.MINUTE, mm)
              cal.set(Calendar.SECOND, 0)
              if (cal.time.before(now)) cal.add(Calendar.DATE, 1)

              def delaySeconds = ((cal.time.time - now.time) / 1000).intValue()
              echo "⏰ Daily run scheduled for ${params.EVERY_TIME}, in ${delaySeconds} sec"
              build job: env.JOB_NAME, wait: false, parameters: buildParams, quietPeriod: delaySeconds
              currentBuild.result = 'SUCCESS'
              return
            }

            else if (params.SCHEDULE_TYPE == 'Weekly') {
              if (!params.WEEK_DAYS || !params.WEEK_TIME)
                error "Please provide WEEK_DAYS and WEEK_TIME"

              def parts = params.WEEK_TIME.tokenize(':')
              def hh = parts[0].toInteger()
              def mm = parts[1].toInteger()
              def daysMap = ['sun':1,'mon':2,'tue':3,'wed':4,'thu':5,'fri':6,'sat':7]
              def nowCal = Calendar.getInstance()
              def soonest = null
              def dayList = params.WEEK_DAYS.toLowerCase().split(',').collect { it.trim() }

              for (d in dayList) {
                if (!daysMap.containsKey(d)) continue
                def c = (Calendar) nowCal.clone()
                c.set(Calendar.DAY_OF_WEEK, daysMap[d])
                c.set(Calendar.HOUR_OF_DAY, hh)
                c.set(Calendar.MINUTE, mm)
                c.set(Calendar.SECOND, 0)
                if (c.time.before(nowCal.time)) c.add(Calendar.WEEK_OF_YEAR, 1)
                if (soonest == null || c.time.before(soonest.time)) soonest = c
              }

              if (soonest == null) error "Invalid WEEK_DAYS input"
              def delaySeconds = ((soonest.time.time - now.time) / 1000).intValue()
              echo "📅 Weekly run scheduled on ${params.WEEK_DAYS} ${params.WEEK_TIME} (in ${delaySeconds}s)"
              build job: env.JOB_NAME, wait: false, parameters: buildParams, quietPeriod: delaySeconds
              currentBuild.result = 'SUCCESS'
              return
            }
          } else {
            echo "▶️ Proceeding with actual test execution (Run now or scheduled run)."
          }
        }
      }
    }

    stage('Checkout') {
      when { expression { params.RUN_MODE == 'Run now' || currentBuild.getBuildCauses().any { it._class?.contains("UpstreamCause") } } }
      steps { checkout scm }
    }

    stage('Select Flows') {
      when { expression { params.RUN_MODE == 'Run now' || currentBuild.getBuildCauses().any { it._class?.contains("UpstreamCause") } } }
      steps {
        script {
          // Convert string 'true'/'false' to real booleans (important for scheduled runs)
          def normalize = { v -> (v instanceof Boolean) ? v : v?.toString()?.toBoolean() }

          def all = [
            'install_adb','install_play','aggregation_check','tnd_check',
            'collection_mode_all','collection_mode_trusted','collection_mode_untrusted',
            'interface_info','ipfix_disable','ipfix_zero','parent_process_check',
            'template_caching_untrusted','before_after_reboot',
            'aup_should_displayed','aup_should_not_displayed','eula_not_accepted','negatives'
          ]

          def chosen = normalize(params.RUN_ALL) ? all : all.findAll { normalize(params[it]) }
          if (!chosen) error 'No flows selected — pick at least one or enable RUN_ALL'
          env.CHOSEN = chosen.join(',')
          echo "Flows selected: ${env.CHOSEN}"
        }
      }
    }

    stage('Run Flows') {
      when { expression { params.RUN_MODE == 'Run now' || currentBuild.getBuildCauses().any { it._class?.contains("UpstreamCause") } } }
      steps {
        script {
          for (f in env.CHOSEN.split(',')) {
            echo "Running flow: ${f}"
            bat "echo Executing suite ${f}"
            // replace above with your actual: npx wdio run wdio.conf.ts --suite ${f}
          }
        }
      }
    }

    stage('Generate Allure') {
      when { expression { params.RUN_MODE == 'Run now' || currentBuild.getBuildCauses().any { it._class?.contains("UpstreamCause") } } }
      steps {
        bat '''
          echo ==== Generate Allure ====
          if not exist allure-results (echo No allure-results found & exit /b 1)
          npx allure generate --clean allure-results -o allure-report
        '''
      }
    }

    stage('Email Report') {
      when { expression { params.RUN_MODE == 'Run now' || currentBuild.getBuildCauses().any { it._class?.contains("UpstreamCause") } } }
      steps {
        script {
          def recipients = (params.EMAILS ?: '').trim()
          if (recipients) {
            def status = currentBuild.currentResult
            def color = (status == 'SUCCESS') ? '#16a34a' : '#dc2626'
            emailext(
              to: recipients,
              subject: "Mobile Sanity Build #${env.BUILD_NUMBER} ${status}",
              mimeType: 'text/html',
              body: """<html><body>
                <p>Hi Team,</p>
                <p>Build Status: <b style="color:${color}">${status}</b></p>
                <p>Executed at: ${new Date().format("yyyy-MM-dd HH:mm:ss")}</p>
                <p>Allure report attached.</p>
              </body></html>""",
              attachmentsPattern: 'allure-report.single.html'
            )
          } else {
            echo 'No email recipients — skipping email.'
          }
        }
      }
    }
  }
}
