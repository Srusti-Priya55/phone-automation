pipeline {
  agent any

  // ---------- PARAMETERS ----------
  parameters {
    booleanParam(name: 'RUN_ALL', defaultValue: false, description: 'Run all suites')

    // keep names EXACTLY like in wdio.conf.ts suites
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

    string(name: 'EMAILS', defaultValue: '', description: 'comma-separated recipients')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Show selections') {
      steps {
        script {
          env.ALL_SUITES = [
            'install_adb','install_play','aggregation_check','tnd_check',
            'collection_mode_all','collection_mode_trusted','collection_mode_untrusted',
            'interface_info','ipfix_disable','ipfix_zero','parent_process_check',
            'template_caching_untrusted','before_after_reboot',
            'aup_should_displayed','aup_should_not_displayed','eula_not_accepted',
            'negatives'
          ].join(',')

          // compute CHOSEN list
          def allSuites = env.ALL_SUITES.split(',')
          def picked = []
          if (params.RUN_ALL) {
            picked = allSuites
          } else {
            allSuites.each { s -> if (params[s]) picked << s }
          }
          env.CHOSEN = picked.join(',')

          echo "RUN_ALL: ${params.RUN_ALL}"
          echo "Suites chosen: ${env.CHOSEN}"
          echo "EMAILS: ${params.EMAILS}"

          if (!env.CHOSEN?.trim()) {
            error "No suites selected — pick at least one or enable RUN_ALL"
          }
        }
      }
    }

    stage('Clean previous reports') {
      steps {
        // remove old allure artifacts (Windows safe)
        bat '''
        if exist allure-results rmdir /s /q allure-results
        if exist allure-report  rmdir /s /q allure-report
        '''
      }
    }

    stage('Install deps') {
      steps {
        bat '''
        call node -v
        if errorlevel 1 ( echo "Node.js not found in PATH" & exit /b 1 )

        call npm ci
        if errorlevel 1 exit /b 1
        '''
      }
    }

    stage('Run suites sequentially (with CURRENT_FLOW)') {
      steps {
        script {
          // map each suite to the "flow" label you want to see in Allure
          def FLOW_MAP = [
            'install_adb'                : 'Install via ADB',
            'install_play'               : 'Install via Play Store',
            'aggregation_check'          : 'Aggregation Check',
            'tnd_check'                  : 'TND Check',

            'collection_mode_all'        : 'Collection Mode - All',
            'collection_mode_trusted'    : 'Collection Mode - Trusted',
            'collection_mode_untrusted'  : 'Collection Mode - Untrusted',
            'interface_info'             : 'Interface Info',

            'ipfix_disable'              : 'IPFIX Disable',
            'ipfix_zero'                 : 'IPFIX Zero',
            'parent_process_check'       : 'Parent Process Check',
            'template_caching_untrusted' : 'Template Caching - Untrusted',
            'before_after_reboot'        : 'Before/After Reboot',
            'aup_should_displayed'       : 'AUP Should Display',
            'aup_should_not_displayed'   : 'AUP Should NOT Display',
            'eula_not_accepted'          : 'EULA Not Accepted',
            'negatives'                   : 'Negatives'
          ]

          def suites = env.CHOSEN.split(',').findAll { it?.trim() }
          for (String s in suites) {
            def flowName = FLOW_MAP.get(s, s)    // default to suite name if not found
            echo "========== RUNNING: ${s}  [FLOW=${flowName}] =========="

            withEnv(["CURRENT_FLOW=${flowName}"]) {
              // run ONE suite at a time so the flow label stays accurate per test file
              bat "npx wdio run wdio.conf.ts --suite ${s}"
            }
          }
        }
      }
    }

    stage('Build Allure report') {
      steps {
        bat 'npx allure generate --clean allure-results -o allure-report'
      }
    }

    stage('Zip Allure report') {
      steps {
        powershell '''
          if (Test-Path allure-report.zip) { Remove-Item allure-report.zip -Force }
          Compress-Archive -Path "allure-report/*" -DestinationPath "allure-report.zip"
        '''
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'allure-results/**, allure-report/**, allure-report.zip', fingerprint: true

      script {
        if (params.EMAILS?.trim()) {
          emailext(
            to: params.EMAILS,
            subject: "Mobile Automation • Build #${env.BUILD_NUMBER} • ${currentBuild.currentResult}",
            body: """Hi,

Mobile Automation run completed.

Build URL: ${env.BUILD_URL}
Result: ${currentBuild.currentResult}

Attached: allure-report.zip (open index.html inside to view the earlier report).
""",
            attachmentsPattern: 'allure-report.zip',
            mimeType: 'text/plain'
          )
        }
      }
    }
  }
}
