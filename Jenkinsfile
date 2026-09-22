pipeline {
    agent any
    stages {
        stage('QA Check') {
            steps {
                sh 'npx mjolnir scan'
                sh 'echo "Quality gate: PASSED"'
            }
        }
    }
    post {
        failure {
            echo 'QA findings detected — review required'
        }
    }
}
