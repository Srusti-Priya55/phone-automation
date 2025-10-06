pipeline {
    agent any

    environment {
        NODE_OPTIONS = "--max-old-space-size=4096"
        EMAILS = "srustikenchol555@gmail.com"
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main',
                    credentialsId: 'github-srusti',
                    url: 'https://github.com/Srusti-Priya55/mobile-automation.git'
            }
        }

        stage('Clean old Allure outputs') {
            steps {
                bat '''
                echo Cleaning old Allure results and reports...
                if exist allure-results rmdir /s /q allure-results
                if exist allure-report rmdir /s /q allure-report
                if exist allure-report-standalone rmdir /s /q allure-report-standalone
                if exist allure-report.zip del /f /q allure-report.zip
                '''
            }
        }

        stage('Install dependencies') {
            steps {
                bat '''
                call node -v
                call npm ci
                '''
            }
        }

        stage('Run selected suites (with CURRENT_FLOW)') {
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

                    // run all suites or set manually
                    def suites = ['interface_info']   // <---- change this if needed

                    for (suite in suites) {
                        def flow = FLOW.get(suite, suite)
                        echo "=== RUNNING ${suite} [FLOW=${flow}] ==="

                        catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                            bat """set CURRENT_FLOW=${flow} && npx wdio run wdio.conf.ts --suite ${suite}"""
                        }
                    }
                }
            }
        }

        stage('Generate Allure report') {
            steps {
                bat '''
                echo ===== Checking allure-results =====
                if exist allure-results (dir /b allure-results) else (echo NO allure-results found!)

                echo === Generating Allure Reports ===
                call "C:\\ProgramData\\Jenkins\\.jenkins\\tools\\ru.yandex.qatools.allure.jenkins.tools.AllureCommandlineInstallation\\Allure-test\\bin\\allure.bat" generate allure-results -c -o allure-report
                npx allure generate --clean allure-results -o allure-report-standalone
                '''
            }
        }

        stage('Zip and Email Allure Report') {
            steps {
                powershell '''
                Compress-Archive -Path "allure-report-standalone/*" -DestinationPath "allure-report.zip" -Force
                '''
                archiveArtifacts artifacts: 'allure-report.zip', fingerprint: true

                emailext(
                    subject: "Mobile Sanity Suite Results - ${currentBuild.currentResult}",
                    body: """Result: ${currentBuild.currentResult}
Build: ${env.BUILD_URL}

Attached is the Allure Report (offline view).
1) Download the ZIP
2) Extract and open index.html""",
                    attachmentsPattern: 'allure-report.zip',
                    to: "${EMAILS}",
                    from: "kencholsrusti@gmail.com"
                )
            }
        }
    }

    post {
        always {
            allure includeProperties: false, jdk: '', results: [[path: 'allure-results']]
        }
    }
}
