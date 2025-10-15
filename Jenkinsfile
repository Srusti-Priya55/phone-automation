pipeline {
  agent any

  parameters {
    // === Scheduling parameters ===
    choice(name: 'RUN_MODE', choices: ['Run now', 'Schedule'], description: 'Select whether to run immediately or schedule the job')
    choice(name: 'SCHEDULE_TYPE', choices: ['Once', 'Everyday', 'Weekly'], description: 'If Schedule selected, choose the type of scheduling')
    string(name: 'ONCE_DATE', defaultValue: '', description: 'Once: date (YYYY-MM-DD)')
    string(name: 'ONCE_TIME', defaultValue: '', description: 'Once: time (HH:mm 24h)')
    string(name: 'EVERY_TIME', defaultValue: '', description: 'Everyday: time (HH:mm 24h)')
    string(name: 'WEEK_DAYS', defaultValue: '', description: 'Weekly: comma-separated days (e.g. Mon,Wed,Fri)')
    string(name: 'WEEK_TIME', defaultValue: '', description: 'Weekly: time (HH:mm 24h)')

    // === Existing parameters ===
    booleanParam(name: 'RUN_ALL', defaultValue: false, description: 'Run all flows')

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
    string(name: 'EMAILS', defaultValue: '', description: 'Recipients (comma-separated)')
  }

  environment {
    NODE_HOME = "C:\\Program Files\\nodejs"
    PATH      = "${env.NODE_HOME};${env.PATH}"
  }

  options { timestamps() }

  stages {

    // ========== NEW STAGE for scheduling ==========
    stage('Schedule or Run') {
      steps {
        script {
          if (params.RUN_MODE == 'Run now') {
            echo "✅ Run-now selected — executing immediately."
          } else if (params.RUN_MODE == 'Schedule') {
            def job = Jenkins.instance.getItemByFullName(env.JOB_NAME)
            def trigger = null
            def cronSpec = ''

            switch (params.SCHEDULE_TYPE) {
              case 'Once':
                if (!params.ONCE_DATE?.trim() || !params.ONCE_TIME?.trim()) {
                  error "Please provide ONCE_DATE and ONCE_TIME for Once schedule."
                }

                // Convert "YYYY-MM-DD HH:mm" to cron format
                def dt = "${params.ONCE_DATE} ${params.ONCE_TIME}"
                def parsed = Date.parse("yyyy-MM-dd HH:mm", dt)
                def cal = Calendar.getInstance(TimeZone.getTimeZone("IST"))
                cal.time = parsed
                cronSpec = "${cal.get(Calendar.MINUTE)} ${cal.get(Calendar.HOUR_OF_DAY)} ${cal.get(Calendar.DAY_OF_MONTH)} ${cal.get(Calendar.MONTH)+1} *"
                echo "📅 Creating one-time schedule: ${cronSpec}"
                break

              case 'Everyday':
                if (!params.EVERY_TIME?.trim()) {
                  error "Please provide EVERY_TIME for Everyday schedule."
                }
                def (hour, minute) = params.EVERY_TIME.split(':')
                cronSpec = "${minute} ${hour} * * *"
                echo "📆 Scheduling EVERYDAY at ${params.EVERY_TIME} (cron: ${cronSpec})"
                break

              case 'Weekly':
                if (!params.WEEK_DAYS?.trim() || !params.WEEK_TIME?.trim()) {
                  error "Please provide WEEK_DAYS and WEEK_TIME for Weekly schedule."
                }
                def dayMap = ['Mon':'1', 'Tue':'2', 'Wed':'3', 'Thu':'4', 'Fri':'5', 'Sat':'6', 'Sun':'0']
                def days = params.WEEK_DAYS.split(',').collect { dayMap[it.trim()] }.join(',')
                def (hourW, minuteW) = params.WEEK_TIME.split(':')
                cronSpec = "${minuteW} ${hourW} * * ${days}"
                echo "🗓️ Scheduling WEEKLY on ${params.WEEK_DAYS} at ${params.WEEK_TIME} (cron: ${cronSpec})"
                break

              default:
                error "Unknown schedule type"
            }

            // Apply trigger
            trigger = new hudson.triggers.TimerTrigger(cronSpec)
            job.addTrigger(trigger)
            job.save()
            echo "✅ Job '${env.JOB_NAME}' scheduled successfully with CRON: ${cronSpec}"

            // Stop current run — will auto-trigger later
            currentBuild.result = 'SUCCESS'
            error "⏸ Build scheduled. Will auto-run at specified time."
          }
        }
      }
    }


    // ========== Original flow continues ==========
    stage('Checkout') {
      steps { checkout scm }
    }

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
          if errorlevel 1 ( echo Node not found & exit /b 1 )
          call npm ci
          if errorlevel 1 exit /b 1
        '''
      }
    }

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

    stage('Run flows (sequential)') {
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

          def results = []

          for (suite in env.CHOSEN.split(',')) {
            def flow = FLOW.get(suite, suite)
            echo "=== RUNNING ${suite} [FLOW=${flow}] ==="
            int code = 1
            withEnv(["CURRENT_FLOW=${flow}"]) {
              catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                code = bat(returnStatus: true, script: "npx wdio run wdio.conf.ts --suite ${suite}")
                if (code != 0) {
                  error "Suite ${suite} failed"
                }
              }
            }
            def status = (code == 0) ? 'SUCCESS' : 'FAILURE'
            results << [name: flow, status: status]
          }

          def lines = results.collect { r -> "${r.name}|${r.status}" }.join('\n')
          writeFile file: 'suite_results.txt', text: lines
        }
      }
    }

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
            dir allure-report
            exit /b 1
          )
          copy /y "allure-report\\allure-report.offline.html" "allure-report.single.html" >nul
          echo Created: allure-report.single.html
        '''
      }
    }

    stage('Publish & Archive') {
      steps {
        script {
          archiveArtifacts artifacts: 'allure-results/**, allure-report/**, tools/**, allure-report.single.html, suite_results.txt', fingerprint: true

          def recipients = (params.EMAILS ?: '').trim()
          if (recipients) {

            def perSuiteHtml = ''
            if (fileExists('suite_results.txt')) {
              def lines = readFile('suite_results.txt').trim().split(/\r?\n/)
              def rows = lines.collect { line ->
                def parts = line.split('\\|', 2)
                def name = parts[0]
                def status = parts.size() > 1 ? parts[1] : ''
                def color = (status == 'SUCCESS') ? '#16a34a' : '#dc2626'
                """
                <tr>
                  <td style="padding:6px 10px;border:1px solid #e5e7eb;">${name}</td>
                  <td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:700;color:${color};">${status}</td>
                </tr>
                """
              }.join('\n')

              perSuiteHtml = """
              <p><strong>Per-suite results:</strong></p>
              <table style="border-collapse:collapse;font-family:Segoe UI,Arial,sans-serif;font-size:13px">
                <tr>
                  <th style="text-align:left;padding:8px 10px;border:1px solid #e5e7eb;background:#f3f4f6;">Test</th>
                  <th style="text-align:left;padding:8px 10px;border:1px solid #e5e7eb;background:#f3f4f6;">Result</th>
                </tr>
                ${rows}
              </table>
              """
            }

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
          .join('\n'))}
  </pre>

    ${perSuiteHtml}

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
