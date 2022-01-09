#!/bin/bash
echo "Run pipeline"
aws codepipeline start-pipeline-execution --name frasercrichton-com-prison-transfer
aws cloudfront create-invalidation --distribution-id E1VVKVW0OYVB18 --paths "/*" 

# aws codepipeline get-pipeline-state --name frasercrichton-com-prison-transfer
