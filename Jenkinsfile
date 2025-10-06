pipeline {
  agent any

  parameters {
    booleanParam(name: 'RUN_ALL', defaultValue: false, description: 'Run all suites')
    booleanParam(name: 'parent_process_check', defaultValue: true, description: '')
    string(name: 'EMAILS', defaultValue: 'srustikenchol555@gmail.com', description: 'Recipients (comma-separated)')
  }

  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('Clean old Allure outputs') {
      steps {
        bat '''
        echo Cleaning old Allure results and reports...
        if exist allure-results rmdir /s /q allure-results
        if exist allure-report  rmdir /s /q allure-report
        if exist allure-report-standalone rmdir /s /q allure-report-standalone
        if exist allure-report-light rmdir /s /q allure-report-light
        del /f /q allure-report*.zip 2>nul
        del /f /q allure-report*.bin 2>nul
        '''
      }
    }

    stage('Install dependencies') {
      steps {
        bat '''
        call node -v
        if errorlevel 1 (echo Node not found & exit /b 1)
        call npm ci
        if errorlevel 1 exit /b 1
        '''
      }
    }

    stage('Run suite') {
      steps {
        catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
          bat 'npx wdio run wdio.conf.ts --suite parent_process_check'
        }
      }
    }

    stage('Verify allure-results') {
      steps {
        bat '''
        echo ===== Checking allure-results =====
        if exist allure-results (dir /b allure-results) else (echo NO allure-results folder found!)
        echo ===================================
        '''
      }
    }
  }

  post {
    always {
      // Publish Allure plugin report (keeps sidebar link working)
      script {
        try {
          if (fileExists('allure-results')) {
            allure(results: [[path: 'allure-results']])
          } else { echo 'No allure-results to publish.' }
        } catch (err) { echo "Allure publish failed: ${err}" }
      }

      // Standalone report for email
      bat '''
      echo Generating standalone Allure report...
      npx allure generate --clean allure-results -o allure-report-standalone
      '''

      // Light copy for email (remove screenshots)
      powershell '''
        if (Test-Path "allure-report-light") { Remove-Item -Recurse -Force "allure-report-light" }
        New-Item -ItemType Directory -Path "allure-report-light" | Out-Null
        Copy-Item -Path "allure-report-standalone\\*" -Destination "allure-report-light" -Recurse -Force
        if (Test-Path "allure-report-light\\data\\attachments") {
          Remove-Item -Recurse -Force "allure-report-light\\data\\attachments"
        }
      '''

      // Zip and Gmail-safe .bin
      powershell '''
        Compress-Archive -Path "allure-report-light/*" -DestinationPath "allure-report.light.zip"
        Copy-Item "allure-report.light.zip" "allure-report.light.bin" -Force
        $size = (Get-Item "allure-report.light.bin").Length
        Write-Host "Light report size: $size bytes"
      '''

      // Archive for Jenkins artifacts
      archiveArtifacts artifacts: 'allure-results/**, allure-report-standalone/**, allure-report-light/**, allure-report.light.*', fingerprint: true

      // Email section
      script {
        if (params.EMAILS?.trim()) {
          emailext(
            from: 'YOUR_GMAIL_ADDRESS_HERE',
            to: params.EMAILS,
            subject: "Mobile Automation • Build #${env.BUILD_NUMBER} • ${currentBuild.currentResult}",
            mimeType: 'text/plain',
            body: """Result: ${currentBuild.currentResult}

Allure (Jenkins): open the **Allure Report** link on the build page.

Offline report attached:
1) Download: allure-report.light.bin
2) Rename to: allure-report.zip
3) Extract and open: index.html
""",
            attachmentsPattern: 'allure-report.light.bin'
          )
        } else { echo 'No EMAILS provided.' }
      }
    }
  }
}
