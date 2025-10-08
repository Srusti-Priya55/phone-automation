pipeline {
  agent any

  parameters {
    booleanParam(name: 'RUN_ALL', defaultValue: false, description: 'Run all suites')

    // Per-suite toggles
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

    string(name: 'EMAILS', defaultValue: '', description: 'Recipients (comma-separated). Leave blank to skip email.')
  }

  environment {
    NODE_HOME = "C:\\Program Files\\nodejs"
    PATH      = "${env.NODE_HOME};${env.PATH}"
  }

  stages {
    stage('Checkout') { steps { checkout scm } }

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

    stage('Clean') {
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

    stage('Run suites') {
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

    stage('Generate Allure') {
      steps {
        bat 'npx allure generate --clean allure-results -o allure-report'
      }
    }

    stage('Make single-file HTML') {
      steps {
        powershell '''
          $ErrorActionPreference = "Stop"
          $ps1 = "tools\\make-allure-offline.ps1"
          if (-not (Test-Path $ps1)) { throw "Missing $ps1 in repo" }
          powershell -NoProfile -ExecutionPolicy Bypass -File $ps1 -ReportDir "allure-report" -OutFile "allure-report.single.html"
        '''
      }
    }

    stage('Publish in Jenkins') {
      steps {
        script {
          // Publishes nice Allure link in Jenkins UI (non-blocking if plugin not present)
          try {
            if (fileExists('allure-results')) {
              allure(results: [[path: 'allure-results']])
            }
          } catch (e) { echo "Allure publish skipped: ${e}" }
        }
        archiveArtifacts artifacts: 'allure-report/**, allure-report.single.html, allure-results/**', fingerprint: true
      }
    }
  }

  post {
    always {
      script {
        if (params.EMAILS?.trim()) {
          def body = """Result: ${currentBuild.currentResult}
Build: ${env.BUILD_URL}

Attachments:
- allure-report.single.html (opens on phone/desktop without a server)
"""
          emailext(
            to: params.EMAILS,
            subject: "Mobile Sanity Suite • Build #${env.BUILD_NUMBER} • ${currentBuild.currentResult}",
            mimeType: 'text/plain',
            body: body,
            attachmentsPattern: 'allure-report.single.html'
          )
        } else {
          echo 'EMAILS empty — skipping email.'
        }
      }
    }
  }
}
