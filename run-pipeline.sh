#!/bin/bash
echo "Run pipeline"
# aws codepipeline start-pipeline-execution --name frasercrichton-com-prison-transfer
aws cloudfront create-invalidation --distribution-id E1HKPD8160XBH4 --paths "/*" 

# aws codepipeline get-pipeline-state --name frasercrichton-com-prison-transfer
