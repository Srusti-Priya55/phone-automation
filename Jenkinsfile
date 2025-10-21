pipeline {
  agent any

  /********** PARAMETERS **********/
  parameters {
    choice(name: 'RUN_MODE', choices: ['Run now', 'Schedule'], description: 'Run immediately or schedule')
    choice(name: 'SCHEDULE_TYPE', choices: ['Once', 'Everyday', 'Weekly'], description: 'If Schedule selected')
    string(name: 'ONCE_DATE', defaultValue: '', description: 'Once: date (YYYY-MM-DD)')
    string(name: 'ONCE_TIME', defaultValue: '', description: 'Once: time (HH:mm 24h)')
    string(name: 'EVERY_TIME', defaultValue: '', description: 'Everyday: time (HH:mm 24h)')
    string(name: 'WEEK_DAYS',  defaultValue: '', description: 'Weekly: e.g. Mon,Tue,Wed or MON-FRI')
    string(name: 'WEEK_TIME',  defaultValue: '', description: 'Weekly: time (HH:mm 24h)')

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

    /********** DISPATCHER: schedule or run **********/
    stage('Schedule or Run') {
      steps {
        script {
          def runMode = (params.RUN_MODE ?: 'Run now').trim()
          if (runMode != 'Schedule') {
            echo "Run now selected — executing immediately."
            return
          }

          // --- We are in "Schedule" path. ---
          def typ = (params.SCHEDULE_TYPE ?: '').trim()
          if (!typ) { error "Please choose SCHEDULE_TYPE (Once / Everyday / Weekly)" }

          // Helper to copy the current parameters & override one value
          def copyParamsWith = { Map<String, String> overrides ->
            def current = currentBuild.rawBuild.getAction(hudson.model.ParametersAction)
            def all = []
            if (current) { all.addAll(current.parameters) }
            overrides.each { k, v ->
              all.removeAll { it.name == k }
              all.add(new hudson.model.StringParameterValue(k, String.valueOf(v)))
            }
            new hudson.model.ParametersAction(all)
          }

          if (typ == 'Once') {
            if (!params.ONCE_DATE?.trim() || !params.ONCE_TIME?.trim()) {
              error "Please provide ONCE_DATE and ONCE_TIME"
            }
            // Parse "yyyy-MM-dd HH:mm" safely
            def sdf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm")
            sdf.setLenient(false)
            def target = sdf.parse("${params.ONCE_DATE.trim()} ${params.ONCE_TIME.trim()}")
            def now = new Date()
            int delay = Math.max(60, ((target.time - now.time) / 1000).intValue())

            echo "Scheduling one-time run in ${delay} seconds..."

            // Enqueue a new build of THIS job with same params but RUN_MODE=Run now
            def j = jenkins.model.Jenkins.getInstance().getItemByFullName(env.JOB_NAME)
            def qid = jenkins.model.Jenkins.getInstance().queue.schedule(
              j,
              delay * 1000L,
              new hudson.model.Cause.UserIdCause(),
              copyParamsWith([RUN_MODE: 'Run now'])
            )
            if (qid == null) {
              error "Failed to schedule delayed build."
            }

            currentBuild.description = "Scheduled once for ${params.ONCE_DATE} ${params.ONCE_TIME}"
            echo "✅ Queued one-time build for ${params.ONCE_DATE} ${params.ONCE_TIME}"

            // hard-stop current build so nothing else runs now
            currentBuild.result = 'SUCCESS'
            error('Scheduled (once). Exiting current build.')
          }

          // Build a Jenkins cron expression (use names MON,TUE,... to avoid number mistakes)
          def toCron = { hhmm ->
            def p = hhmm.split(':')
            if (p.size() != 2) { error "Bad time '${hhmm}', expected HH:mm" }
            int hh = p[0].toInteger(); int mm = p[1].toInteger()
            if (hh < 0 || hh > 23 || mm < 0 || mm > 59) { error "Time out of range: ${hhmm}" }
            return String.format("%02d %02d", mm, hh) // "mm HH"
          }

          if (typ == 'Everyday') {
            if (!params.EVERY_TIME?.trim()) { error "Please provide EVERY_TIME" }
            def mmHH = toCron(params.EVERY_TIME.trim())
            def cronExpr = "${mmHH} * * *"
            echo "Setting daily cron: '${cronExpr}'"
            properties([pipelineTriggers([cron(cronExpr)])])
            currentBuild.description = "Daily @ ${params.EVERY_TIME.trim()}"
            echo "✅ Daily schedule saved. No run now."

            currentBuild.result = 'SUCCESS'
            error('Scheduled (daily). Exiting current build.')
          }

          if (typ == 'Weekly') {
            if (!params.WEEK_DAYS?.trim() || !params.WEEK_TIME?.trim()) {
              error "Please provide WEEK_DAYS and WEEK_TIME"
            }
            def mmHH = toCron(params.WEEK_TIME.trim())

            // Normalize days -> MON,TUE,... or a range like MON-FRI
            def rawDays = params.WEEK_DAYS.trim()
            def normalized
            if (rawDays.contains('-')) {
              // e.g. Mon-Fri
              def map = ['mon':'MON','tue':'TUE','wed':'WED','thu':'THU','fri':'FRI','sat':'SAT','sun':'SUN']
              def parts = rawDays.split('-',2)
              if (parts.size()!=2) { error "Bad WEEK_DAYS range '${rawDays}'" }
              normalized = "${map[parts[0].toLowerCase()]}-${map[parts[1].toLowerCase()]}"
            } else {
              normalized = rawDays
                .replaceAll('(?i)Monday','MON').replaceAll('(?i)Mon','MON')
                .replaceAll('(?i)Tuesday','TUE').replaceAll('(?i)Tue','TUE')
                .replaceAll('(?i)Wednesday','WED').replaceAll('(?i)Wed','WED')
                .replaceAll('(?i)Thursday','THU').replaceAll('(?i)Thu','THU')
                .replaceAll('(?i)Friday','FRI').replaceAll('(?i)Fri','FRI')
                .replaceAll('(?i)Saturday','SAT').replaceAll('(?i)Sat','SAT')
                .replaceAll('(?i)Sunday','SUN').replaceAll('(?i)Sun','SUN')
                .toUpperCase()
            }

            def cronExpr = "${mmHH} * * ${normalized}"
            echo "Setting weekly cron: '${cronExpr}'"
            properties([pipelineTriggers([cron(cronExpr)])])
            currentBuild.description = "Weekly ${normalized} @ ${params.WEEK_TIME.trim()}"
            echo "✅ Weekly schedule saved. No run now."

            currentBuild.result = 'SUCCESS'
            error('Scheduled (weekly). Exiting current build.')
          }

          error "Unknown SCHEDULE_TYPE: ${typ}"
        }
      }
    }

    /********** THE REST ONLY RUNS FOR 'RUN NOW' **********/
    stage('Checkout') {
      when { expression { params.RUN_MODE?.trim() == 'Run now' } }
      steps { checkout scm }
    }

    stage('Agent sanity') {
      when { expression { params.RUN_MODE?.trim() == 'Run now' } }
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
      when { expression { params.RUN_MODE?.trim() == 'Run now' } }
      steps {
        bat '''
          if exist allure-results rmdir /s /q allure-results
          if exist allure-report rmdir /s /q allure-report
          if exist allure-report.single.html del /f /q allure-report.single.html
        '''
      }
    }

    stage('Install deps') {
      when { expression { params.RUN_MODE?.trim() == 'Run now' } }
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
      when { expression { params.RUN_MODE?.trim() == 'Run now' } }
      steps {
        script {
          def all = [
            'install_adb','install_play','aggregation_check','tnd_check',
            'collection_mode_all','collection_mode_trusted','collection_mode_untrusted',
            'interface_info','ipfix_disable','ipfix_zero','parent_process_check',
            'template_caching_untrusted','before_after_reboot',
            'aup_should_displayed','aup_should_not_displayed','eula_not_accepted','negatives'
          ]
          def chosen = params.RUN_ALL ? all : all.findAll { params[it] }
          if (!chosen || chosen.isEmpty()) {
            echo '⚠️ No checkbox selected — skipping execution (auto-triggered build?)'
            env.CHOSEN = ''
          } else {
            env.CHOSEN = chosen.join(',')
            echo "Flows selected: ${env.CHOSEN}"
          }
        }
      }
    }

    stage('Run flows (sequential)') {
      when { expression { params.RUN_MODE?.trim() == 'Run now' && env.CHOSEN } }
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

          writeFile file: 'suite_results.txt', text: results.collect { r -> "${r.name}|${r.status}" }.join('\n')
        }
      }
    }

    stage('Generate Allure') {
      when { expression { params.RUN_MODE?.trim() == 'Run now' && fileExists('allure-results') } }
      steps {
        bat '''
          echo ==== Generate Allure ====
          npx allure generate --clean allure-results -o allure-report
        '''
      }
    }

    stage('Publish Allure (Jenkins link)') {
      when { expression { params.RUN_MODE?.trim() == 'Run now' && fileExists('allure-results') } }
      steps {
        script {
          allure(results: [[path: 'allure-results']])
          echo 'Published Allure results to Jenkins.'
        }
      }
    }

    stage('Make single-file HTML (no server)') {
      when { expression { params.RUN_MODE?.trim() == 'Run now' && fileExists('allure-report\\index.html') } }
      steps {
        bat '''
          echo ==== Build single HTML ====
          if not exist tools\\pack-allure-onehtml.js (
            echo Missing tools\\pack-allure-onehtml.js
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
      when { expression { params.RUN_MODE?.trim() == 'Run now' } }
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
    (params.collect { k, v -> v && k != 'RUN_ALL' && k != 'EMAILS' && !['Run now','Schedule','Once','Everyday','Weekly'].contains(k) ? " - ${k}" : null }
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
