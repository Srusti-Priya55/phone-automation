pipeline {
  agent any

  parameters {
    // ==== Scheduling UI (new) ====
    choice(name: 'SCHEDULE_MODE',
           choices: ['Run now', 'Schedule once', 'Recurring'],
           description: 'How to run this build')
    string(name: 'ONCE_DATE', defaultValue: 'YYYY-MM-DD',
           description: 'For "Schedule once": local date, e.g. 2025-10-13')
    string(name: 'ONCE_TIME', defaultValue: 'HH:mm',
           description: 'For "Schedule once": 24h time, e.g. 21:35')
    string(name: 'RECUR_CRON', defaultValue: 'H 3 * * 1-5',
           description: 'For "Recurring": Jenkins cron (e.g. H 3 * * 1-5)')

    // ==== Your existing parameters (unchanged) ====
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

    // ====================== NEW: scheduling gate ======================
    stage('Resolve scheduling mode') {
      steps {
        script {
          def mode = (params.SCHEDULE_MODE ?: 'Run now').trim()

          if (mode == 'Run now') {
            echo "[Scheduler] Mode=Run now → continue this build now."
            currentBuild.description = "Run now"
          }

          else if (mode == 'Schedule once') {
            def d = (params.ONCE_DATE ?: '').trim()
            def t = (params.ONCE_TIME ?: '').trim()
            if (!d || !t || !(d ==~ /\d{4}-\d{2}-\d{2}/) || !(t ==~ /\d{2}:\d{2}/)) {
              error "Invalid ONCE_DATE/ONCE_TIME. Expect YYYY-MM-DD and HH:mm (24h). Got '${d} ${t}'."
            }

            def now    = java.time.ZonedDateTime.now()
            def target = java.time.ZonedDateTime.of(
                            java.time.LocalDate.parse(d),
                            java.time.LocalTime.parse(t),
                            now.getZone()
                         )
            def delaySec = java.time.Duration.between(now, target).getSeconds()
            if (delaySec < 0) {
              echo "[Scheduler] Target is in the past — shifting to NEXT DAY same time."
              target   = target.plusDays(1)
              delaySec = java.time.Duration.between(now, target).getSeconds()
            }
            echo "[Scheduler] Will schedule a NEW build at ${target} (delay=${delaySec}s)."

            // Rebuild THIS job with ALL current parameters, in the future
            def paramList = []
            [
              'SCHEDULE_MODE','ONCE_DATE','ONCE_TIME','RECUR_CRON',
              'RUN_ALL','install_adb','install_play','aggregation_check','tnd_check',
              'collection_mode_all','collection_mode_trusted','collection_mode_untrusted',
              'interface_info','ipfix_disable','ipfix_zero','parent_process_check',
              'template_caching_untrusted','before_after_reboot',
              'aup_should_displayed','aup_should_not_displayed','eula_not_accepted',
              'negatives','EMAILS'
            ].each { n ->
              if (params.containsKey(n)) {
                def v = params[n]
                if (v instanceof Boolean) {
                  paramList << booleanParam(name: n, value: v)
                } else {
                  paramList << string(name: n, value: v?.toString() ?: '')
                }
              }
            }

            build job: env.JOB_NAME,
                  parameters: paramList,
                  quietPeriod: delaySec as int,
                  wait: false

            currentBuild.description = "Scheduled once: ${d} ${t}"
            echo "[Scheduler] Scheduled. Stopping THIS controller build."
            error("Scheduled a future run; stopping now.")
          }

          else if (mode == 'Recurring') {
            def cron = (params.RECUR_CRON ?: '').trim()
            if (!cron) error "RECUR_CRON is empty. Provide a Jenkins cron expression."

            // ---- OPTION A (safe-by-default): instruct the user ----
            echo """
[Scheduler] Recurring requested.
Open Job → Configure → Build periodically and paste this cron:
${cron}

Tip: If you install 'Parameterized Scheduler' plugin, use
'Build periodically with parameters' to also pass suite flags.
"""
            currentBuild.description = "Recurring requested: ${cron}"
            error("Recurring schedule not auto-applied (safe mode).")

            /* ---- OPTION B (auto-apply cron to THIS job) ----
            // WARNING: This modifies job config for everyone until removed.
            properties([ pipelineTriggers([ cron(cron) ]) ])
            echo "[Scheduler] Applied cron trigger '${cron}' to this job. Stopping this run."
            currentBuild.description = "Cron: ${cron}"
            error("Cron trigger set; future runs will start by cron.")
            */
          }

          else {
            error "Unknown SCHEDULE_MODE: ${mode}"
          }
        }
      }
    }
    // =================== /NEW: scheduling gate =======================

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

          // Save per-suite results in plain text (sandbox-safe)
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

            // Build a per-suite HTML table
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
