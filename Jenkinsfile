pipeline {
  agent any

  parameters {
    // --- Schedule UI ---
    choice(name: 'RUN_MODE',      choices: ['Run now', 'Schedule'], description: 'Run immediately or schedule')
    choice(name: 'SCHEDULE_TYPE', choices: ['Once', 'Everyday', 'Weekly'], description: 'If Schedule selected')
    string(name: 'ONCE_DATE',  defaultValue: '', description: 'Once: date (YYYY-MM-DD)')
    string(name: 'ONCE_TIME',  defaultValue: '', description: 'Once: time (HH:mm 24h)')
    string(name: 'EVERY_TIME', defaultValue: '', description: 'Everyday: time (HH:mm 24h)')
    string(name: 'WEEK_DAYS',  defaultValue: '', description: 'Weekly: comma days (Mon,Tue,Wed,Thu,Fri,Sat,Sun)')
    string(name: 'WEEK_TIME',  defaultValue: '', description: 'Weekly: time (HH:mm 24h)')

    // --- Your existing params (unchanged) ---
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

    // ========== SCHEDULER GATE ==========
    stage('Schedule or Run') {
      steps {
        script {
          if (params.RUN_MODE == 'Schedule') {

            // ---- helpers ----
            def curlScheduleOnce = { delaySeconds ->
              // Carry **all** params into the future run so checkboxes & EMAILS persist
              def kv = [
                "RUN_MODE=Run now",
                "RUN_ALL=${params.RUN_ALL}",
                "install_adb=${params.install_adb}",
                "install_play=${params.install_play}",
                "aggregation_check=${params.aggregation_check}",
                "tnd_check=${params.tnd_check}",
                "collection_mode_all=${params.collection_mode_all}",
                "collection_mode_trusted=${params.collection_mode_trusted}",
                "collection_mode_untrusted=${params.collection_mode_untrusted}",
                "interface_info=${params.interface_info}",
                "ipfix_disable=${params.ipfix_disable}",
                "ipfix_zero=${params.ipfix_zero}",
                "parent_process_check=${params.parent_process_check}",
                "template_caching_untrusted=${params.template_caching_untrusted}",
                "before_after_reboot=${params.before_after_reboot}",
                "aup_should_displayed=${params.aup_should_displayed}",
                "aup_should_not_displayed=${params.aup_should_not_displayed}",
                "eula_not_accepted=${params.eula_not_accepted}",
                "negatives=${params.negatives}",
                "EMAILS=${params.EMAILS}"
              ].collect { '--data-urlencode "' + it + '"' }.join(" ^\n")

              bat """
                curl -X POST "http://localhost:8080/job/${env.JOB_NAME}/buildWithParameters" ^
                --user "srusti:117b7e239d09ff5b11e0fc2dbee0cae33f" ^
                ${kv} ^
                --data-urlencode "delay=${delaySeconds}sec"
              """
            }

            def setCronWithDefaults = { cronExpr ->
              // Update job defaults to match CURRENT selections,
              // so future cron builds use the same checkboxes + emails.
              properties([
                parameters([
                  booleanParam(name: 'RUN_ALL', defaultValue: params.RUN_ALL, description: 'Run all flows'),
                  booleanParam(name: 'install_adb',                defaultValue: params.install_adb, description: ''),
                  booleanParam(name: 'install_play',               defaultValue: params.install_play, description: ''),
                  booleanParam(name: 'aggregation_check',          defaultValue: params.aggregation_check, description: ''),
                  booleanParam(name: 'tnd_check',                  defaultValue: params.tnd_check, description: ''),
                  booleanParam(name: 'collection_mode_all',        defaultValue: params.collection_mode_all, description: ''),
                  booleanParam(name: 'collection_mode_trusted',    defaultValue: params.collection_mode_trusted, description: ''),
                  booleanParam(name: 'collection_mode_untrusted',  defaultValue: params.collection_mode_untrusted, description: ''),
                  booleanParam(name: 'interface_info',             defaultValue: params.interface_info, description: ''),
                  booleanParam(name: 'ipfix_disable',              defaultValue: params.ipfix_disable, description: ''),
                  booleanParam(name: 'ipfix_zero',                 defaultValue: params.ipfix_zero, description: ''),
                  booleanParam(name: 'parent_process_check',       defaultValue: params.parent_process_check, description: ''),
                  booleanParam(name: 'template_caching_untrusted', defaultValue: params.template_caching_untrusted, description: ''),
                  booleanParam(name: 'before_after_reboot',        defaultValue: params.before_after_reboot, description: ''),
                  booleanParam(name: 'aup_should_displayed',       defaultValue: params.aup_should_displayed, description: ''),
                  booleanParam(name: 'aup_should_not_displayed',   defaultValue: params.aup_should_not_displayed, description: ''),
                  booleanParam(name: 'eula_not_accepted',          defaultValue: params.eula_not_accepted, description: ''),
                  booleanParam(name: 'negatives',                  defaultValue: params.negatives, description: ''),
                  string(name: 'EMAILS', defaultValue: params.EMAILS ?: '', description: 'Recipients (comma-separated)')
                ]),
                pipelineTriggers([cron(cronExpr)])
              ])
            }

            // ---- routing ----
            if (params.SCHEDULE_TYPE == 'Once') {
              if (!params.ONCE_DATE?.trim() || !params.ONCE_TIME?.trim()) {
                error "Please provide ONCE_DATE and ONCE_TIME"
              }
              def sdf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm")
              def target = sdf.parse("${params.ONCE_DATE.trim()} ${params.ONCE_TIME.trim()}")
              def now = new Date()
              int delay = Math.max(60, ((target.time - now.time) / 1000).intValue()) // Jenkins requires ≥60s to be safe

              echo "Scheduling one-time run in ${delay} seconds..."
              curlScheduleOnce(delay)
              echo "✅ One-time schedule set for ${params.ONCE_DATE} ${params.ONCE_TIME}"
              currentBuild.description = "Scheduled once for ${params.ONCE_DATE} ${params.ONCE_TIME}"
              currentBuild.result = 'SUCCESS'
              return // ← do NOT run now
            }

            if (params.SCHEDULE_TYPE == 'Everyday') {
              if (!params.EVERY_TIME?.trim()) { error "Please provide EVERY_TIME (HH:mm)" }
              def parts = params.EVERY_TIME.trim().split(':')
              if (parts.size() != 2) { error "EVERY_TIME must be HH:mm" }
              def hh = parts[0]; def mm = parts[1]
              def cronExpr = "${mm} ${hh} * * *"
              echo "Setting daily cron: ${cronExpr}"
              setCronWithDefaults(cronExpr)
              echo "✅ Daily schedule saved. This run will NOT execute now."
              currentBuild.description = "Daily @ ${params.EVERY_TIME}"
              currentBuild.result = 'SUCCESS'
              return // ← do NOT run now
            }

            if (params.SCHEDULE_TYPE == 'Weekly') {
              if (!params.WEEK_DAYS?.trim() || !params.WEEK_TIME?.trim()) {
                error "Please provide WEEK_DAYS and WEEK_TIME"
              }
              def toDow = { s ->
                switch (s.toLowerCase()) {
                  case ['mon','monday']  : return 'MON'
                  case ['tue','tues','tuesday'] : return 'TUE'
                  case ['wed','weds','wednesday']: return 'WED'
                  case ['thu','thur','thurs','thursday']: return 'THU'
                  case ['fri','friday']  : return 'FRI'
                  case ['sat','saturday']: return 'SAT'
                  case ['sun','sunday']  : return 'SUN'
                  default: return null
                }
              }
              def daysList = params.WEEK_DAYS.split(/\s*,\s*/).collect { toDow(it) }.findAll { it != null }
              if (daysList.isEmpty()) { error "WEEK_DAYS must be like Mon,Wed,Fri" }

              def parts = params.WEEK_TIME.trim().split(':')
              if (parts.size() != 2) { error "WEEK_TIME must be HH:mm" }
              def hh = parts[0]; def mm = parts[1]

              def cronExpr = "${mm} ${hh} * * ${daysList.join(',')}"
              echo "Setting weekly cron: ${cronExpr}"
              setCronWithDefaults(cronExpr)
              echo "✅ Weekly schedule saved. This run will NOT execute now."
              currentBuild.description = "Weekly ${daysList.join(',')} @ ${params.WEEK_TIME}"
              currentBuild.result = 'SUCCESS'
              return // ← do NOT run now
            }

            error "Unknown SCHEDULE_TYPE: ${params.SCHEDULE_TYPE}"
          } else {
            echo "Run now selected — executing immediately."
          }
        }
      }
    }

    // ================= RUN-NOW PIPELINE =================

    stage('Checkout') { steps { checkout scm } }

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
          if (!chosen) {
            echo '⚠️ No checkbox selected — skipping execution (auto-triggered or empty selection).'
            // Write empty results so email stage can still run if you want; or just fail:
            error 'No flows selected — pick at least one or enable RUN_ALL'
          }
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
                if (code != 0) { error "Suite ${suite} failed" }
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
              }.join('\\n')

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
              subject: "Mobile Sanity  Build #${env.BUILD_NUMBER}  ${status}",
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
