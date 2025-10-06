pipeline {
  agent any

  /***********************
   * PARAMETERS (17 suites)
   ***********************/
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

  /***********************
   * ENV
   ***********************/
  environment {
    // Your configured sender is kencholsrusti@gmail.com in Manage Jenkins › Configure System (SMTP)
    NODE_HOME = "C:\\Program Files\\nodejs"
    PATH = "${env.NODE_HOME};${env.PATH}"
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
          if (!chosen) { error 'No suites selected — pick at least one or enable RUN_ALL' }
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

    stage('Run suites (sequential with CURRENT_FLOW)') {
      steps {
        script {
          // Human-readable flow names used by your wdio.beforeTest hook
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

          for (suite in env.CHOSEN.split(',')) {
            def flow = FLOW.get(suite, suite)
            echo "=== RUNNING ${suite} [FLOW=${flow}] ==="
            withEnv(["CURRENT_FLOW=${flow}"]) {
              // continue pipeline even if a suite fails (Allure + email still run)
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

  /***********************
   * POST: publish, package, email
   ***********************/
  post {
    always {
      // 1) Publish clickable Allure link in Jenkins (uses plugin)
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

      // 2) Generate full & standalone reports
      bat '''
        echo Generating Allure report (full + standalone)...
        if exist allure-report rmdir /s /q allure-report
        if exist allure-report-standalone rmdir /s /q allure-report-standalone
        npx allure generate --clean allure-results -o allure-report
        npx allure generate --clean allure-results -o allure-report-standalone
      '''

      // 3) Make LIGHT copy (remove screenshots) and zip for email
      powershell '''
        try {
          if (Test-Path "allure-report-light") { Remove-Item -Recurse -Force "allure-report-light" }
          New-Item -ItemType Directory -Path "allure-report-light" | Out-Null
          Copy-Item -Path "allure-report\\*" -Destination "allure-report-light" -Recurse -Force
          if (Test-Path "allure-report-light\\data\\attachments") {
            Remove-Item -Recurse -Force "allure-report-light\\data\\attachments"
          }
          if (Test-Path "allure-report.light.allurezip") { Remove-Item "allure-report.light.allurezip" -Force }
          Compress-Archive -Path "allure-report-light/*" -DestinationPath "allure-report.light.allurezip"
          $full = (Get-ChildItem "allure-report" -Recurse -Force | Measure-Object -Property Length -Sum).Sum
          $light = (Get-ChildItem "allure-report-light" -Recurse -Force | Measure-Object -Property Length -Sum).Sum
          $email = (Get-Item "allure-report.light.allurezip").Length
          Write-Host ("Sizes -> full:{0}B light:{1}B email:{2}B" -f $full,$light,$email)
        } catch {
          Write-Host "Packaging (light) failed (non-fatal): $($_.Exception.Message)"
        }
      '''

      // 4) Archive artifacts
      archiveArtifacts artifacts: 'allure-results/**, allure-report/**, allure-report-standalone/**, allure-report-light/**, allure-report.light.allurezip', fingerprint: true

      // 5) Email the LIGHT attachment (renamed extension so Gmail won’t block)
      script {
        if (params.EMAILS?.trim()) {
          catchError(buildResult: currentBuild.currentResult, stageResult: 'FAILURE') {
            emailext(
              // Sender must equal the Gmail account configured in Manage Jenkins › Configure System
              from: 'kencholsrusti@gmail.com',
              to: params.EMAILS,
              subject: "Mobile Sanity Suite • Build #${env.BUILD_NUMBER} • ${currentBuild.currentResult}",
              mimeType: 'text/plain',
              body: """Result: ${currentBuild.currentResult}
Build page: ${env.BUILD_URL}

Jenkins (LAN) report: open the **Allure Report** link on the build page.

Offline report attached (LIGHT):
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
