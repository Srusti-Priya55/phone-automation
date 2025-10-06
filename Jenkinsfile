pipeline {
  agent any

  parameters {
    booleanParam(name: 'RUN_ALL', defaultValue: false, description: 'Run all suites')

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

    stage('Clean old allure results & screenshots') {
      steps {
        bat '''
        echo Cleaning old Allure results and screenshots...
        if exist allure-results rmdir /s /q allure-results
        if exist allure-report  rmdir /s /q allure-report
        if exist allure-report-light rmdir /s /q allure-report-light
        if exist allure-report.zip del /f /q allure-report.zip
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
              // Continue even if a suite fails; post { always } will still run
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
      // Publish Allure link (plugin)
      script {
        try {
          if (fileExists('allure-results')) {
            allure(results: [[path: 'allure-results']])
          } else {
            echo 'No allure-results to publish.'
          }
        } catch (err) {
          echo "Allure publish step failed (non-fatal): ${err}"
        }
      }

      // Generate FULL static report
      bat '''
      echo Generating Allure report (full)...
      if exist allure-report rmdir /s /q allure-report
      if exist allure-report.zip del /f /q allure-report.zip
      npx allure generate --clean allure-results -o allure-report
      '''

      // Create LIGHT copy WITHOUT attachments (no robocopy; pure PowerShell to avoid non-zero exit codes)
      powershell '''
        try {
          if (Test-Path "allure-report-light") { Remove-Item -Recurse -Force "allure-report-light" }
          New-Item -ItemType Directory -Path "allure-report-light" | Out-Null

          # Copy everything
          Copy-Item -Path "allure-report\\*" -Destination "allure-report-light" -Recurse -Force

          # Remove heavy attachments from the light copy
          if (Test-Path "allure-report-light\\data\\attachments") {
            Remove-Item -Recurse -Force "allure-report-light\\data\\attachments"
          }
        } catch {
          Write-Host "Light copy step failed (non-fatal): $($_.Exception.Message)"
        }
      '''

      // Zip FULL and LIGHT variants
      powershell '''
        try {
          if (Test-Path "allure-report.zip") { Remove-Item "allure-report.zip" -Force }
          if (Test-Path "allure-report.light.allurezip") { Remove-Item "allure-report.light.allurezip" -Force }

          Compress-Archive -Path "allure-report/*" -DestinationPath "allure-report.zip"
          Compress-Archive -Path "allure-report-light/*" -DestinationPath "allure-report.light.allurezip"
        } catch {
          Write-Host "Zipping step failed (non-fatal): $($_.Exception.Message)"
        }
      '''

      // Archive artifacts (always)
      archiveArtifacts artifacts: 'allure-results/**, allure-report/**, allure-report.zip, allure-report-light/**, allure-report.light.allurezip', fingerprint: true

      // Email LIGHT attachment (Gmail-safe); never fail the build if email fails
      script {
        if (params.EMAILS?.trim()) {
          catchError(buildResult: currentBuild.currentResult, stageResult: 'FAILURE') {
            emailext(
              from: 'kencholsrusti@gmail.com',  // set to your Gmail SMTP username
              to: params.EMAILS,
              subject: "Mobile Automation • Build #${env.BUILD_NUMBER} • ${currentBuild.currentResult}",
              mimeType: 'text/plain',
              body: """Result: ${currentBuild.currentResult}
Build: ${env.BUILD_URL}

Online report (Jenkins): use the **Allure Report** link on the build page.

Offline report attached (light; fresh run only):
1) Download: allure-report.light.allurezip
2) Rename to: allure-report.zip
3) Extract and open: index.html
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
