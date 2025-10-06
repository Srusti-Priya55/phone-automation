pipeline {
  agent any

  parameters {
    booleanParam(name: 'RUN_ALL', defaultValue: false, description: 'Run all suites')

    // --- Suite switches (names must match wdio.conf.ts -> suites keys) ---
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

    // --- Email recipients ---
    string(name: 'EMAILS', defaultValue: '', description: 'Recipients (comma-separated)')
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
          if (!chosen) error 'No suites selected — pick at least one or enable RUN_ALL'
          env.CHOSEN = chosen.join(',')
          echo "Suites selected: ${env.CHOSEN}"
        }
      }
    }

    stage('Clean old Allure outputs (fresh run)') {
      steps {
        bat '''
        echo Cleaning old Allure results and reports...
        if exist allure-results rmdir /s /q allure-results
        if exist allure-report  rmdir /s /q allure-report

        :: our own standalone/light copies
        if exist allure-report-standalone  rmdir /s /q allure-report-standalone
        if exist allure-report-light       rmdir /s /q allure-report-light

        if exist allure-report.zip del /f /q allure-report.zip
        if exist allure-report-light.zip del /f /q allure-report-light.zip
        if exist allure-report.light.allurezip del /f /q allure-report.light.allurezip
        '''
      }
    }

    stage('Install dependencies') {
      steps {
        bat '''
        call node -v
        if errorlevel 1 ( echo Node not found & exit /b 1 )
        call npm ci
        if errorlevel 1 exit /b 1
        '''
      }
    }

    stage('Run selected suites (sequential with CURRENT_FLOW)') {
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
              // keep going even if a suite fails
              catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                bat "npx wdio run wdio.conf.ts --suite ${suite}"
              }
            }
          }
        }
      }
    }

    stage('Verify allure-results') {
      steps {
        bat '''
          echo ===== Checking allure-results =====
          if exist allure-results ( dir /b allure-results ) else ( echo NO allure-results folder found! )
          echo ===================================
        '''
      }
    }
  }

  post {
    always {
      // 1) Publish Allure sidebar link (uses Jenkins plugin)
      script {
        try {
          if (fileExists('allure-results')) {
            allure(results: [[path: 'allure-results']])
          } else {
            echo 'No allure-results to publish.'
          }
        } catch (err) {
          echo "Allure plugin publish step failed (non-fatal): ${err}"
        }
      }

      // 2) Generate a FULL standalone HTML copy (do NOT touch plugin's allure-report)
      bat '''
      echo Generating Allure report (standalone copy)...
      if exist allure-report-standalone rmdir /s /q allure-report-standalone
      npx allure generate --clean allure-results -o allure-report-standalone
      '''

      // 3) Make a LIGHT copy without screenshots/attachments (for smaller email)
      powershell '''
        try {
          if (Test-Path "allure-report-light") { Remove-Item -Recurse -Force "allure-report-light" }
          New-Item -ItemType Directory -Path "allure-report-light" | Out-Null
          Copy-Item -Path "allure-report-standalone\\*" -Destination "allure-report-light" -Recurse -Force
          if (Test-Path "allure-report-light\\data\\attachments") {
            Remove-Item -Recurse -Force "allure-report-light\\data\\attachments"
          }
        } catch {
          Write-Host "Light copy step failed (non-fatal): $($_.Exception.Message)"
        }
      '''

      // 4) Zip both copies; duplicate the light zip to .allurezip (Gmail-safe)
      powershell '''
        try {
          if (Test-Path "allure-report.zip") { Remove-Item "allure-report.zip" -Force }
          if (Test-Path "allure-report-light.zip") { Remove-Item "allure-report-light.zip" -Force }
          if (Test-Path "allure-report.light.allurezip") { Remove-Item "allure-report.light.allurezip" -Force }

          Compress-Archive -Path "allure-report-standalone/*" -DestinationPath "allure-report.zip"
          Compress-Archive -Path "allure-report-light/*"      -DestinationPath "allure-report-light.zip"

          Copy-Item "allure-report-light.zip" "allure-report.light.allurezip" -Force
        } catch {
          Write-Host "Zipping/rename step failed (non-fatal): $($_.Exception.Message)"
        }
      '''

      // 5) Archive everything so you can download from Jenkins
      archiveArtifacts artifacts: 'allure-results/**, allure-report/**, allure-report-standalone/**, allure-report-light/**, allure-report.zip, allure-report-light.zip, allure-report.light.allurezip', fingerprint: true

      // 6) Email the LIGHT offline copy (won't be blocked by Gmail)
      script {
        if (params.EMAILS?.trim()) {
          catchError(buildResult: currentBuild.currentResult, stageResult: 'FAILURE') {
            emailext(
              from: 'YOUR_GMAIL_ADDRESS_HERE',  // <-- set to your Gmail SMTP username
              to: params.EMAILS,
              subject: "Mobile Automation • Build #${env.BUILD_NUMBER} • ${currentBuild.currentResult}",
              mimeType: 'text/plain',
              body: """Result: ${currentBuild.currentResult}

Offline Allure report attached (LIGHT version; fresh run only):
1) Download: allure-report.light.allurezip
2) Rename to: allure-report.zip
3) Extract and open: index.html

Full report is archived in Jenkins as 'allure-report.zip'.
""",
              attachmentsPattern: 'allure-report.light.allurezip'
            )
          }
        } else {
          echo 'EMAILS not provided — skipping email.'
        }
      }
    }
  }
}
