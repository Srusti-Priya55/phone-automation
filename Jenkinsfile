pipeline {
  agent any

  parameters {
    booleanParam(name: 'RUN_ALL', defaultValue: false, description: 'Run all suites')

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
      steps { checkout scm }
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

          def allSuites = env.ALL_SUITES.split(',')
          def picked = []
          if (params.RUN_ALL) picked = allSuites
          else allSuites.each { s -> if (params[s]) picked << s }

          env.CHOSEN = picked.join(',')
          echo "RUN_ALL: ${params.RUN_ALL}"
          echo "Suites chosen: ${env.CHOSEN}"
          echo "EMAILS: ${params.EMAILS}"
          if (!env.CHOSEN?.trim()) error "No suites selected — pick at least one or enable RUN_ALL"
        }
      }
    }

    stage('Clean previous reports') {
      steps {
        bat '''
        if exist allure-results rmdir /s /q allure-results
        if exist allure-report  rmdir /s /q allure-report
        if exist allure-report.zip del /f /q allure-report.zip
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
            'negatives'                  : 'Negatives'
          ]

          def suites = env.CHOSEN.split(',').findAll { it?.trim() }
          for (String s in suites) {
            def flowName = FLOW_MAP.get(s, s)
            echo "========== RUNNING: ${s}  [FLOW=${flowName}] =========="
            withEnv(["CURRENT_FLOW=${flowName}"]) {
              // If one suite fails, continue to the next but mark pipeline as FAILURE
              catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                bat "npx wdio run wdio.conf.ts --suite ${s}"
              }
            }
          }
        }
      }
    }
  }

  /* -------- ALWAYS build & email a report, even if tests failed -------- */
  post {
    always {
      // Build Allure (if allure-results exists); otherwise create a tiny fallback report
      bat '''
      if exist allure-results (
        echo Generating Allure report...
        npx allure generate --clean allure-results -o allure-report
      ) else (
        echo No allure-results found. Creating minimal fallback report...
        mkdir allure-report
        > allure-report\\index.html echo ^<html^><body^><h3^>No allure-results were produced.^</h3^>^<p^>Check console log.^</p^>^</body^>^</html^>
      )
      '''

      // ZIP (always produce a zip; if report is minimal, it still zips that)
      powershell '''
        if (Test-Path allure-report.zip) { Remove-Item allure-report.zip -Force }
        if (-not (Test-Path allure-report)) {
          New-Item -ItemType Directory -Path allure-report | Out-Null
          Set-Content -Path "allure-report/README.txt" -Value "No report generated. See Jenkins console."
        }
        Compress-Archive -Path "allure-report/*" -DestinationPath "allure-report.zip"
      '''

      // Archive to Jenkins
      archiveArtifacts artifacts: 'allure-results/**, allure-report/**, allure-report.zip', fingerprint: true

      // Email ZIP regardless of success/failure
      script {
        if (params.EMAILS?.trim()) {
          emailext(
            to: params.EMAILS,
            subject: "Mobile Automation • Build #${env.BUILD_NUMBER} • ${currentBuild.currentResult}",
            body: """Hi,

Mobile Automation run completed with result: ${currentBuild.currentResult}
Build URL: ${env.BUILD_URL}

The Allure (earlier) report is attached as a ZIP.
Open index.html inside the ZIP to view it.
""",
            attachmentsPattern: 'allure-report.zip',
            mimeType: 'text/plain'
          )
        } else {
          echo 'EMAILS not provided; skipping email.'
        }
      }
    }
  }
}
