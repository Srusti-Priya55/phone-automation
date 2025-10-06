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

  environment {
    NODE_HOME = "C:\\Program Files\\nodejs"
    PATH      = "${env.NODE_HOME};${env.PATH}"
  }

  stages {
    stage('Checkout'){ steps { checkout scm } }

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

    stage('Clean (fresh run only)') {
      steps {
        bat '''
          echo Cleaning old Allure outputs...
          if exist allure-results rmdir /s /q allure-results
          if exist allure-report rmdir /s /q allure-report
          if exist allure-report-standalone rmdir /s /q allure-report-standalone
          if exist allure-report-light rmdir /s /q allure-report-light
          if exist allure-report.zip del /f /q allure-report.zip
          if exist allure-report-light.zip del /f /q allure-report-light.zip
          if exist allure-report.light.b64 del /f /q allure-report.light.b64
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

    stage('Run suites (sequential with CURRENT_FLOW)') {
      steps {
        script {
          def FLOW = [
            install_adb:'Install via ADB', install_play:'Install via Play Store',
            aggregation_check:'Aggregation Check', tnd_check:'TND Check',
            collection_mode_all:'Collection Mode - All',
            collection_mode_trusted:'Collection Mode - Trusted',
            collection_mode_untrusted:'Collection Mode - Untrusted',
            interface_info:'Interface Info', ipfix_disable:'IPFIX Disable',
            ipfix_zero:'IPFIX Zero', parent_process_check:'Parent Process Check',
            template_caching_untrusted:'Template Caching - Untrusted',
            before_after_reboot:'Before/After Reboot',
            aup_should_displayed:'AUP Should Display',
            aup_should_not_displayed:'AUP Should NOT Display',
            eula_not_accepted:'EULA Not Accepted',
            negatives:'Negatives'
          ]
          for (suite in env.CHOSEN.split(',')) {
            def flow = FLOW.get(suite, suite)
            echo "=== RUNNING ${suite} [FLOW=${flow}] ==="
            withEnv(["CURRENT_FLOW=${flow}"]) {
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
      // Jenkins Allure link
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

      // Generate reports
      bat '''
        echo Generating Allure (full + standalone)...
        if exist allure-report rmdir /s /q allure-report
        if exist allure-report-standalone rmdir /s /q allure-report-standalone
        npx allure generate --clean allure-results -o allure-report
        npx allure generate --clean allure-results -o allure-report-standalone
      '''

      // Create LIGHT zip and a Gmail-safe base64 text
      powershell '''
        try {
          if (Test-Path "allure-report-light") { Remove-Item -Recurse -Force "allure-report-light" }
          New-Item -ItemType Directory -Path "allure-report-light" | Out-Null
          Copy-Item -Path "allure-report\\*" -Destination "allure-report-light" -Recurse -Force
          if (Test-Path "allure-report-light\\data\\attachments") {
            Remove-Item -Recurse -Force "allure-report-light\\data\\attachments"
          }

          # ZIP for Jenkins artifacts
          if (Test-Path "allure-report-light.zip") { Remove-Item "allure-report-light.zip" -Force }
          Compress-Archive -Path "allure-report-light/*" -DestinationPath "allure-report-light.zip"

          # Make Gmail-safe text attachment (base64 of the ZIP)
          if (Test-Path "allure-report.light.b64") { Remove-Item "allure-report.light.b64" -Force }
          [IO.File]::WriteAllBytes("allure-report.light.b64", [System.Text.Encoding]::UTF8.GetBytes([Convert]::ToBase64String([IO.File]::ReadAllBytes("allure-report-light.zip"))))

          $full  = (Get-ChildItem "allure-report" -Recurse -Force | Measure-Object -Property Length -Sum).Sum
          $light = (Get-Item "allure-report-light.zip").Length
          $b64   = (Get-Item "allure-report.light.b64").Length
          Write-Host ("Sizes -> full:{0}B lightZip:{1}B b64:{2}B" -f $full,$light,$b64)
        } catch {
          Write-Host "Packaging step failed (non-fatal): $($_.Exception.Message)"
        }
      '''

      // Archive everything in Jenkins
      archiveArtifacts artifacts: 'allure-results/**, allure-report/**, allure-report-standalone/**, allure-report-light/**, allure-report-light.zip, allure-report.light.b64', fingerprint: true

      // Email (attach Gmail-safe text)
      script {
        if (params.EMAILS?.trim()) {
          catchError(buildResult: currentBuild.currentResult, stageResult: 'FAILURE') {
            emailext(
              from: 'kencholsrusti@gmail.com',
              to: params.EMAILS,
              subject: "Mobile Sanity Suite • Build #${env.BUILD_NUMBER} • ${currentBuild.currentResult}",
              mimeType: 'text/plain',
              body: """Result: ${currentBuild.currentResult}
Build page (LAN): ${env.BUILD_URL}

Jenkins (office network): click the **Allure Report** link on the build page.

Offline report (works anywhere: phone/ home):
- Attachment: allure-report.light.b64  (base64 text)
- How to get the ZIP:
    Windows PowerShell:
      Get-Content allure-report.light.b64 | %{[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($_))} > allure-report-light.zip
    macOS/ Linux:
      base64 -d allure-report.light.b64 > allure-report-light.zip
- Then unzip **allure-report-light.zip** and open **index.html**.

Note: you must EXTRACT the ZIP before opening index.html; viewing inside the ZIP shows a blank page.
""",
              attachmentsPattern: 'allure-report.light.b64'
            )
          }
        } else {
          echo 'EMAILS not provided — skipping email.'
        }
      }
    }
  }
}
