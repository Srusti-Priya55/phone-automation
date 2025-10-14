pipeline {
  agent any

  /***********************
   *  NEW: scheduling params (simple strings/choices so it works even without plugins)
   ***********************/
  parameters {
    // TOP switch like your web UI
    choice(name: 'SCHEDULE_MODE', choices: ['Run now', 'Schedule'], description: 'Run immediately or schedule')

    // If SCHEDULE_MODE=Schedule, pick type
    choice(name: 'SCHEDULE_TYPE', choices: ['(not used)', 'Once', 'Everyday', 'Weekly'], description: 'Schedule type when SCHEDULE_MODE=Schedule')

    // ONCE run (local Jenkins time)
    string(name: 'ONCE_DATE', defaultValue: '', description: 'Once: YYYY-MM-DD (e.g. 2025-10-15)')
    string(name: 'ONCE_TIME', defaultValue: '', description: 'Once: HH:mm (24h, e.g. 21:30)')

    // Every day at the same time (local Jenkins time)
    string(name: 'EVERY_TIME', defaultValue: '', description: 'Everyday: HH:mm (24h)')

    // Weekly: comma days + time (local Jenkins time)
    string(name: 'WEEK_DAYS', defaultValue: '', description: 'Weekly: comma-separated short days, e.g. Mon,Wed,Fri')
    string(name: 'WEEK_TIME', defaultValue: '', description: 'Weekly: HH:mm (24h)')

    // ======= your existing params (unchanged) =======
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

    /***********************
     * NEW: Gate to Run Now vs Schedule
     ***********************/
    stage('Schedule or Run') {
      steps {
        script {
          if (params.SCHEDULE_MODE == 'Run now') {
            echo 'Run-now selected — proceeding with pipeline immediately.'
            return
          }

          // SCHEDULE_MODE == 'Schedule'
          if (params.SCHEDULE_TYPE == 'Once') {
            // Parse ONCE_DATE + ONCE_TIME into a delay (seconds) and re-queue this same job
            if (!params.ONCE_DATE?.trim() || !params.ONCE_TIME?.trim()) {
              error "For 'Once' schedule, please fill ONCE_DATE (YYYY-MM-DD) and ONCE_TIME (HH:mm)."
            }

            def fmt = new java.text.SimpleDateFormat('yyyy-MM-dd HH:mm')
            // Use controller timezone (Jenkins server time)
            fmt.setTimeZone(java.util.TimeZone.getDefault())
            def target = fmt.parse("${params.ONCE_DATE.trim()} ${params.ONCE_TIME.trim()}")
            def now = new Date()
            long delaySec = Math.floor((target.time - now.time) / 1000).toLong()

            if (delaySec < 5) {
              error "The chosen date/time appears to be in the past or too soon. Please pick a future time."
            }
            echo "Scheduling a one-shot run in ${delaySec} seconds at ${target} (server time)."

            // Rebuild this same job later with the same parameters:
            // pull all submitted params from this build and pass through.
            def pAction = currentBuild.rawBuild.getAction(hudson.model.ParametersAction)
            def allParams = (pAction?.parameters ?: [])
            build job: env.JOB_NAME, parameters: allParams, quietPeriod: delaySec, wait: false

            echo 'One-shot schedule created. Stopping this build (nothing else to do now).'
            // Stop the current build so it doesn’t run immediately.
            currentBuild.result = 'SUCCESS'
            // Use error to exit early out of the pipeline without marking it failed.
            error 'Scheduled only — exiting this run.'
          }

          if (params.SCHEDULE_TYPE == 'Everyday') {
            if (!params.EVERY_TIME?.trim()) {
              error "For 'Everyday' schedule, please fill EVERY_TIME (HH:mm 24h)."
            }
            // Convert 'HH:mm' to Jenkins cron (min hour * * *). e.g. 30 21 * * *
            def (hour, min) = params.EVERY_TIME.trim().tokenize(':')
            if (!hour || !min) { error "EVERY_TIME must be HH:mm (e.g. 21:30)" }
            def cron = "${min} ${hour} * * *"
            echo "Create/update weekly scheduler job for DAILY cron: ${cron}"
            // Fall through to the DSL stage that creates a helper timer job
          }

          if (params.SCHEDULE_TYPE == 'Weekly') {
            if (!params.WEEK_DAYS?.trim() || !params.WEEK_TIME?.trim()) {
              error "For 'Weekly' schedule, fill WEEK_DAYS (Mon,Wed,...) and WEEK_TIME (HH:mm)."
            }
            // Convert day names to Jenkins cron day numbers (1-7, where 1=SUN)
            // Jenkins accepts SUN,MON,... too. We'll use SUN..SAT words for clarity.
            def dayMap = ['SUN','MON','TUE','WED','THU','FRI','SAT']
            def selected = params.WEEK_DAYS.split(/\s*,\s*/).collect { it[0..2].toUpperCase() }
            def bad = selected.find { !(it in dayMap) && !(it in ['MON','TUE','WED','THU','FRI','SAT','SUN']) }
            if (bad) { error "Unknown day: ${bad}. Use Mon,Tue,Wed,Thu,Fri,Sat,Sun" }
            def dayList = selected.join(',')
            def (hour, min) = params.WEEK_TIME.trim().tokenize(':')
            if (!hour || !min) { error "WEEK_TIME must be HH:mm (e.g. 09:45)" }
            def cron = "${min} ${hour} * * ${dayList}"
            echo "Create/update weekly scheduler job for WEEKLY cron: ${cron}"
            // Fall through to the DSL stage that creates a helper timer job
          }
        }
      }
    }

    /***********************
     * NEW: Only runs when SCHEDULE_MODE=Schedule and SCHEDULE_TYPE in (Everyday|Weekly)
     * We create/update a *companion* timer job that triggers THIS job with the same params.
     * Requires the "Job DSL" plugin (Manage Jenkins → Plugins).
     ***********************/
    stage('Create/Update scheduler job (recurring)') {
      when {
        expression { params.SCHEDULE_MODE == 'Schedule' && (params.SCHEDULE_TYPE == 'Everyday' || params.SCHEDULE_TYPE == 'Weekly') }
      }
      steps {
        script {
          // Compute CRON string from params
          String cronExpr
          if (params.SCHEDULE_TYPE == 'Everyday') {
            def (hour, min) = params.EVERY_TIME.trim().tokenize(':')
            cronExpr = "${min} ${hour} * * *"
          } else {
            def selected = params.WEEK_DAYS.split(/\s*,\s*/).collect { it[0..2].toUpperCase() }
            def (hour, min) = params.WEEK_TIME.trim().tokenize(':')
            cronExpr = "${min} ${hour} * * ${selected.join(',')}"
          }

          // A helper job name
          def timerJob = "${env.JOB_NAME}-scheduler"

          // Build a Job DSL that:
          //  - creates/updates a Pipeline job named "<this>-scheduler"
          //  - sets a cron trigger
          //  - its pipeline script just calls this job (env.JOB_NAME) with the latest saved params
          def dsl = """
pipelineJob('${timerJob}') {
  description('Auto-generated scheduler for ${env.JOB_NAME}. Do not edit by hand.')
  triggers {
    cron('${cronExpr}')
  }
  definition {
    cps {
      script(\"\"\"\
pipeline {
  agent any
  stages {
    stage('Trigger main job') {
      steps {
        script {
          // NOTE: If you want to lock which parameters are forwarded, list them explicitly.
          // Here we just call the main job with the last saved defaults of the main job.
          build job: '${env.JOB_NAME}', wait: false, propagate: false
        }
      }
    }
  }
}
\"\"\")
      sandbox(true)
    }
  }
}
"""
          writeFile file: 'scheduler.groovy', text: dsl
          jobDsl targets: 'scheduler.groovy', removedJobAction: 'IGNORE', removedViewAction: 'IGNORE', lookupStrategy: 'JENKINS_ROOT'

          echo "Created/updated scheduler job '${timerJob}' with cron '${cronExpr}'."
          echo "This build will end now; the recurring scheduler will run the main job on its schedule."

          currentBuild.result = 'SUCCESS'
          error 'Scheduler created — exiting this run.'
        }
      }
    }

    /***********************
     * From here on — your original pipeline (UNCHANGED)
     ***********************/
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
