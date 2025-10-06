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

    stage('Select suites') {
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
          if (!chosen) error 'No suites selected'
          env.CHOSEN = chosen.join(',')
          echo "Suites: ${env.CHOSEN}"
        }
      }
    }

    stage('Clean old reports') {
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
        if errorlevel 1 ( echo Node not found & exit /b 1 )
        call npm ci
        if errorlevel 1 exit /b 1
        '''
      }
    }

    stage('Run suites (sequential with CURRENT_FLOW)') {
      steps {
        script {
          def FLOW = [
            'install_adb':'Install via ADB',
            'install_play':'Install via Play Store',
            'aggregation_check':'Aggregation Check',
            'tnd_check':'TND Check',
            'collection_mode_all':'Collection Mode - All',
            'collection_mode_trusted':'Collection Mode - Trusted',
            'collection_mode_untrusted':'Collection Mode - Untrusted',
            'interface_info':'Interface Info',
            'ipfix_disable':'IPFIX Disable',
            'ipfix_zero':'IPFIX Zero',
            'parent_process_check':'Parent Process Check',
            'template_caching_untrusted':'Template Caching - Untrusted',
            'before_after_reboot':'Before/After Reboot',
            'aup_should_displayed':'AUP Should Display',
            'aup_should_not_displayed':'AUP Should NOT Display',
            'eula_not_accepted':'EULA Not Accepted',
            'negatives':'Negatives'
          ]

          for (suite in env.CHOSEN.split(',')) {
            def flow = FLOW.get(suite, suite)
            echo "=== RUNNING ${suite} [FLOW=${flow}] ==="
            withEnv(["CURRENT_FLOW=${flow}"]) {
              // continue even if a suite fails
              catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                bat "npx wdio run wdio.conf.ts --suite ${suite}"
              }
            }
          }
        }
      }
    }
  }

  post {
    always {
      // 1) Publish Allure in Jenkins (needs Allure Jenkins plugin)
      //    This creates the clickable "Allure Report" link on the build.
      script {
        if (fileExists('allure-results')) {
          allure(results: [[path: 'allure-results']])   // <-- plugin step
        } else {
          echo 'No allure-results found; publishing will be skipped.'
        }
      }

      // 2) Also produce a ZIP (so email always has an attachment)
      bat '''
      if exist allure-results (
        npx allure generate --clean allure-results -o allure-report
      ) else (
        mkdir allure-report
        > allure-report\\index.html echo ^<html^><body^><h3^>No allure-results were produced.^</h3^>^</body^>^</html^>
      )
      '''
      powershell '''
        if (Test-Path allure-report.zip) { Remove-Item allure-report.zip -Force }
        if (-not (Test-Path allure-report)) {
          New-Item -ItemType Directory -Path allure-report | Out-Null
          Set-Content -Path "allure-report/README.txt" -Value "No report generated. See Jenkins console."
        }
        Compress-Archive -Path "allure-report/*" -DestinationPath "allure-report.zip"
      '''

      archiveArtifacts artifacts: 'allure-results/**, allure-report/**, allure-report.zip', fingerprint: true

      // 3) Email the ZIP, regardless of pass/fail
      script {
        if (params.EMAILS?.trim()) {
          emailext(
            to: params.EMAILS,
            subject: "Mobile Automation • Build #${env.BUILD_NUMBER} • ${currentBuild.currentResult}",
            body: """Result: ${currentBuild.currentResult}
Build:  ${env.BUILD_URL}

The Allure report is attached (ZIP) and also available as a link on this build page.""",
            attachmentsPattern: 'allure-report.zip',
            mimeType: 'text/plain'
          )
        } else {
          echo 'EMAILS empty; skipping email.'
        }
      }
    }
  }
}
