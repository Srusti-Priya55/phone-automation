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
          if (params.RUN_MODE == 'Schedule') {

            // ---------- COMMON PARAMS ----------
            def buildParams = currentBuild.rawBuild.getAction(hudson.model.ParametersAction).parameters
            def sdf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm")
            def now = new Date()

            // ---------- ONCE ----------
            if (params.SCHEDULE_TYPE == 'Once') {
              if (!params.ONCE_DATE || !params.ONCE_TIME) error "Please provide ONCE_DATE and ONCE_TIME"
              def target = sdf.parse("${params.ONCE_DATE} ${params.ONCE_TIME}")
              def delaySeconds = ((target.time - now.time) / 1000).intValue()
              if (delaySeconds < 60) delaySeconds = 60

              echo "⏱ Scheduling one-time run in ${delaySeconds} seconds (${target})"
              build job: env.JOB_NAME, wait: false, parameters: buildParams, quietPeriod: delaySeconds
              echo "✅ One-time job scheduled successfully."
              currentBuild.result = 'SUCCESS'
              return
            }

            // ---------- EVERYDAY ----------
            else if (params.SCHEDULE_TYPE == 'Everyday') {
              if (!params.EVERY_TIME) error "Please provide EVERY_TIME"
              def (hh, mm) = params.EVERY_TIME.split(':')*.toInteger()
              def cal = Calendar.getInstance()
              cal.set(Calendar.HOUR_OF_DAY, hh)
              cal.set(Calendar.MINUTE, mm)
              cal.set(Calendar.SECOND, 0)
              if (cal.time.before(now)) cal.add(Calendar.DATE, 1)

              def delaySeconds = ((cal.time.time - now.time) / 1000).intValue()
              echo "⏰ Scheduling daily run at ${params.EVERY_TIME} (first trigger in ${delaySeconds} sec)."

              build job: env.JOB_NAME, wait: false, parameters: buildParams, quietPeriod: delaySeconds
              echo "✅ First daily run scheduled. Please use Jenkins cron for persistent scheduling."
              currentBuild.result = 'SUCCESS'
              return
            }

            // ---------- WEEKLY ----------
            else if (params.SCHEDULE_TYPE == 'Weekly') {
              if (!params.WEEK_DAYS || !params.WEEK_TIME) error "Please provide WEEK_DAYS and WEEK_TIME"
              def daysMap = ['sun':0,'mon':1,'tue':2,'wed':3,'thu':4,'fri':5,'sat':6]
              def dayList = params.WEEK_DAYS.toLowerCase().split(',').collect{it.trim()}
              def (hh, mm) = params.WEEK_TIME.split(':')*.toInteger()

              def nowCal = Calendar.getInstance()
              def soonest = null

              for (d in dayList) {
                if (!daysMap.containsKey(d)) continue
                def c = nowCal.clone()
                c.set(Calendar.DAY_OF_WEEK, daysMap[d])
                c.set(Calendar.HOUR_OF_DAY, hh)
                c.set(Calendar.MINUTE, mm)
                c.set(Calendar.SECOND, 0)
                if (c.time.before(nowCal.time)) c.add(Calendar.WEEK_OF_YEAR, 1)
                if (soonest == null || c.time.before(soonest.time)) soonest = c
              }

              if (soonest == null) error "Invalid WEEK_DAYS input — expected e.g. MON,TUE"
              def delaySeconds = ((soonest.time.time - now.time) / 1000).intValue()

              echo "📅 Scheduling weekly run on ${params.WEEK_DAYS} at ${params.WEEK_TIME} (in ${delaySeconds} sec)"
              build job: env.JOB_NAME, wait: false, parameters: buildParams, quietPeriod: delaySeconds
              echo "✅ First weekly run scheduled."
              currentBuild.result = 'SUCCESS'
              return
            }
          } 
          else {
            echo "▶️ Run now selected — proceeding immediately."
          }
        }
      }
    }

    // ==================== MAIN STAGES (Run Now only) ====================

    stage('Checkout') {
      when { expression { params.RUN_MODE == 'Run now' } }
      steps { checkout scm }
    }

    stage('Agent sanity') {
      when { expression { params.RUN_MODE == 'Run now' } }
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
      when { expression { params.RUN_MODE == 'Run now' } }
      steps {
        bat '''
          if exist allure-results rmdir /s /q allure-results
          if exist allure-report rmdir /s /q allure-report
          if exist allure-report.single.html del /f /q allure-report.single.html
        '''
      }
    }

    stage('Install deps') {
      when { expression { params.RUN_MODE == 'Run now' } }
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
      when { expression { params.RUN_MODE == 'Run now' } }
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
          if (!chosen) error 'No flows selected — pick at least one or enable RUN_ALL'
          env.CHOSEN = chosen.join(',')
          echo "Flows selected: ${env.CHOSEN}"
        }
      }
    }

    stage('Run flows (sequential)') {
      when { expression { params.RUN_MODE == 'Run now' } }
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
      when { expression { params.RUN_MODE == 'Run now' } }
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
      when { expression { params.RUN_MODE == 'Run now' } }
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
      when { expression { params.RUN_MODE == 'Run now' } }
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
      when { expression { params.RUN_MODE == 'Run now' } }
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

            def status = currentBuild.currentResult
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
