pipeline {
  agent any

  parameters {

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
    choice(name: 'RUN_MODE', choices: ['Run now', 'Schedule'], description: 'Run immediately or schedule')
    choice(name: 'SCHEDULE_TYPE', choices: ['Once', 'Everyday', 'Weekly'], description: 'If Schedule selected')

    // 💡 Added clear instructions for each scheduling field
    string(name: 'ONCE_DATE', defaultValue: '', description: 'Once: date (YYYY-MM-DD). Fill this only when SCHEDULE_TYPE = Once')
    string(name: 'ONCE_TIME', defaultValue: '', description: 'Once: time (HH:mm 24h). Fill this only when SCHEDULE_TYPE = Once')
    string(name: 'EVERY_TIME', defaultValue: '', description: 'Everyday: time (HH:mm 24h). Fill this only when SCHEDULE_TYPE = Everyday')
    string(name: 'WEEK_DAYS', defaultValue: '', description: 'Weekly: Mon,Tue,Wed,Thu,Fri,Sat,Sun. Fill this only when SCHEDULE_TYPE = Weekly')
    string(name: 'WEEK_TIME', defaultValue: '', description: 'Weekly: time (HH:mm 24h). Fill this only when SCHEDULE_TYPE = Weekly')
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
          // Detect if this is a scheduler trigger (upstream) or user-triggered run
          def causes = currentBuild.getBuildCauses()
          def isUpstream = causes.any { it._class?.contains("UpstreamCause") }

          // ✅ Validation checks added here
          if (params.RUN_MODE == 'Schedule') {
            if (params.SCHEDULE_TYPE == 'Once' && (!params.ONCE_DATE?.trim() || !params.ONCE_TIME?.trim())) {
              error "⛔ For 'Once' schedule type, please fill both ONCE_DATE (YYYY-MM-DD) and ONCE_TIME (HH:mm 24h)."
            }
            if (params.SCHEDULE_TYPE == 'Everyday' && !params.EVERY_TIME?.trim()) {
              error "⛔ For 'Everyday' schedule type, please fill EVERY_TIME (HH:mm 24h)."
            }
            if (params.SCHEDULE_TYPE == 'Weekly' && (!params.WEEK_DAYS?.trim() || !params.WEEK_TIME?.trim())) {
              error "⛔ For 'Weekly' schedule type, please fill both WEEK_DAYS (Mon,Tue,Wed,...) and WEEK_TIME (HH:mm 24h)."
            }
          }

          if (params.RUN_MODE == 'Schedule' && !isUpstream) {
            env.SCHEDULE_ONLY = 'true'  // mark scheduler build
            def now = new Date()
            def sdf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm")
            def buildParams = currentBuild.rawBuild.getAction(hudson.model.ParametersAction).parameters

            if (params.SCHEDULE_TYPE == 'Once') {
              def target = sdf.parse("${params.ONCE_DATE} ${params.ONCE_TIME}")
              def delaySeconds = ((target.time - now.time) / 1000).intValue()
              if (delaySeconds < 60) delaySeconds = 60

              echo "⏱ One-time schedule: running after ${delaySeconds} seconds (${target})"
              build job: env.JOB_NAME, wait: false, parameters: buildParams, quietPeriod: delaySeconds
              echo "✅ Scheduled successfully. This build will now exit."
              currentBuild.result = 'SUCCESS'
              return
            }

            else if (params.SCHEDULE_TYPE == 'Everyday') {
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
              echo "✅ Scheduled successfully. This build will now exit."
              currentBuild.result = 'SUCCESS'
              return
            }

            else if (params.SCHEDULE_TYPE == 'Weekly') {
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
              echo "✅ Scheduled successfully. This build will now exit."
              currentBuild.result = 'SUCCESS'
              return
            }
          } else {
            env.SCHEDULE_ONLY = 'false'
            echo "▶️ Proceeding with actual test execution (Run now or scheduled run)."
          }
        }
      }
    }

    stage('Checkout') {
      when { expression { env.SCHEDULE_ONLY == 'false' } }
      steps { checkout scm }
    }

    stage('Select Flows') {
      when { expression { env.SCHEDULE_ONLY == 'false' } }
      steps {
        script {
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
          def FLOW = [
            install_adb               : 'Install via ADB',
            install_play              : 'Install via Play Store',
            aggregation_check         : 'Aggregation Check',
            tnd_check                 : 'TND Check',
            collection_mode_all       : 'Collection Mode - All',
            collection_mode_trusted   : 'Collection Mode - Trusted',
            collection_mode_untrusted : 'Collection Mode - Untrusted',
            interface_info            : 'Interface Info',
            ipfix_disable             : 'IPFIX Disable',
            ipfix_zero                : 'IPFIX Zero',
            parent_process_check      : 'Parent Process Check',
            template_caching_untrusted: 'Template Caching - Untrusted',
            before_after_reboot       : 'Before/After Reboot',
            aup_should_displayed      : 'AUP Should Display',
            aup_should_not_displayed  : 'AUP Should NOT Display',
            eula_not_accepted         : 'EULA Not Accepted',
            negatives                 : 'Negatives'
          ]

          bat '''
            echo ==== Cleaning previous allure-results ====
            if exist allure-results rmdir /s /q allure-results
            if exist allure-report rmdir /s /q allure-report
            if exist allure-report.single.html del /f /q allure-report.single.html
          '''

          for (suite in env.CHOSEN.split(',')) {
            def flow = FLOW.get(suite, suite)
            echo "=== RUNNING ${suite} [FLOW=${flow}] ==="

            withEnv(["CURRENT_FLOW=${flow}"]) {
              catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                bat "npx wdio run wdio.conf.ts --suite ${suite}"
              }
            }
          }
        }
      }
    }

    stage('Publish Allure (Jenkins link)') {
      when { expression { env.SCHEDULE_ONLY == 'false' } }
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

    stage('Make single-file HTML (no server)') {
      when { expression { env.SCHEDULE_ONLY == 'false' } }
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
            dir allure-report
            exit /b 1
          )
          copy /y "allure-report\\allure-report.offline.html" "allure-report.single.html" >nul
          echo Created: allure-report.single.html
        '''
      }
    }

    stage('Publish & Archive') {
      when { expression { env.SCHEDULE_ONLY == 'false' } }
      steps {
        script {
          archiveArtifacts artifacts: 'allure-results/**, allure-report/**, tools/**, allure-report.single.html', fingerprint: true

          def recipients = (params.EMAILS ?: '').trim()
          if (recipients) {
            def status      = currentBuild.currentResult
            def statusColor = (status == 'SUCCESS') ? '#16a34a' : '#dc2626'

            emailext(
              to: recipients,
              subject: "Mobile Sanity Build #${env.BUILD_NUMBER} ${status}",
              mimeType: 'text/html',
              body: """<html>
              <body style="font-family:Segoe UI, Arial, sans-serif; font-size:14px; color:#111827;">
                <p>Hi Team,</p>
                <p>This is an automated build status update from the Mobile Automation Suite.</p>
                <p><strong>Status:</strong>
                  <span style="font-weight:700; color:${statusColor};">${status}</span>
                </p>
                <p>
                  <strong>Executed On:</strong> ${new Date().format("yyyy-MM-dd HH:mm:ss")}<br/>
                  <strong>Duration:</strong> ${currentBuild.durationString.replace(' and counting', '')}
                </p>
                <p><strong>Executed Test Cases:</strong></p>
                <pre style="background:#f8fafc;border:1px solid #e5e7eb;padding:8px;border-radius:6px;white-space:pre-wrap;margin:0;">
                ${params.RUN_ALL ? 'All test cases executed (RUN_ALL selected)' :
                    (params.collect { k, v -> v && k != 'RUN_ALL' && k != 'EMAILS' ? " - ${k}" : null }
                          .findAll { it != null }
                          .join('\\n'))}
                </pre>
                <p style="margin-top:12px;">Attached: <em>allure-report.single.html</em>.</p>
              </body>
            </html>""",
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
