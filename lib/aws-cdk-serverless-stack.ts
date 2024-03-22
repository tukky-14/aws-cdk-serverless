// 必要なAWS CDKライブラリをインポートします。
import { Construct } from 'constructs';
import {
    Stack,
    StackProps,
    aws_s3,
    aws_cloudfront,
    aws_cloudfront_origins,
    aws_s3_deployment,
    aws_iam,
    RemovalPolicy,
    Duration,
} from 'aws-cdk-lib';

// AWS CDKでスタックを定義するクラスを作成します。スタックとは、AWSリソースの集まりを指します。
export class AwsCdkServerlessStack extends Stack {
    // コンストラクターを定義します。スタックの初期設定を行います。
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // S3バケットを作成します。ウェブサイトのファイルを格納するためのストレージです。
        const websiteBucket = new aws_s3.Bucket(this, 'WebsiteBucket', {
            // スタックの削除時にS3バケットも削除されるように設定します。
            removalPolicy: RemovalPolicy.DESTROY,
        });

        // CloudFrontのOrigin Access Identityを作成します。これにより、CloudFrontがS3バケットに安全にアクセスできます。
        const originAccessIdentity = new aws_cloudfront.OriginAccessIdentity(
            this,
            'OriginAccessIdentity',
            {
                comment: 'website-distribution-originAccessIdentity',
            }
        );

        // S3バケットポリシーを作成します。CloudFrontからのアクセスのみを許可します。
        const webSiteBucketPolicyStatement = new aws_iam.PolicyStatement({
            actions: ['s3:GetObject'], // S3オブジェクトの取得のみを許可します。
            effect: aws_iam.Effect.ALLOW, // 許可するアクションです。
            principals: [
                new aws_iam.CanonicalUserPrincipal(
                    originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
                ),
            ],
            resources: [`${websiteBucket.bucketArn}/*`], // このポリシーが適用されるリソースです。
        });

        // 作成したポリシーステートメントをS3バケットに適用します。
        websiteBucket.addToResourcePolicy(webSiteBucketPolicyStatement);

        // CloudFrontディストリビューションを作成します。ウェブサイトのコンテンツをキャッシュし、配信を高速化します。
        const distribution = new aws_cloudfront.Distribution(this, 'distribution', {
            comment: 'website-distribution',
            defaultRootObject: 'index.html', // ルートオブジェクトを指定します。
            errorResponses: [
                // エラーレスポンスをカスタマイズします。
                {
                    ttl: Duration.seconds(300),
                    httpStatus: 403,
                    responseHttpStatus: 403,
                    responsePagePath: '/error.html',
                },
                {
                    ttl: Duration.seconds(300),
                    httpStatus: 404,
                    responseHttpStatus: 404,
                    responsePagePath: '/error.html',
                },
            ],
            defaultBehavior: {
                allowedMethods: aws_cloudfront.AllowedMethods.ALLOW_GET_HEAD,
                cachedMethods: aws_cloudfront.CachedMethods.CACHE_GET_HEAD,
                cachePolicy: aws_cloudfront.CachePolicy.CACHING_OPTIMIZED,
                viewerProtocolPolicy: aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, // HTTPSへのリダイレクトを強制します。
                origin: new aws_cloudfront_origins.S3Origin(websiteBucket, {
                    originAccessIdentity,
                }),
            },
            priceClass: aws_cloudfront.PriceClass.PRICE_CLASS_ALL, // プライスクラスを設定します。
        });

        // S3バケットにウェブサイトのファイルをデプロイします。ここではindex.html, error.html, favicon.icoをデプロイしています。
        new aws_s3_deployment.BucketDeployment(this, 'WebsiteDeploy', {
            sources: [
                aws_s3_deployment.Source.data(
                    '/index.html',
                    '<html><body><h1>Hello World</h1></body></html>'
                ),
                aws_s3_deployment.Source.data(
                    '/error.html',
                    '<html><body><h1>Error!!!!!!!!!!!!!</h1></body></html>'
                ),
                aws_s3_deployment.Source.data('/favicon.ico', ''),
            ],
            destinationBucket: websiteBucket,
            distribution: distribution,
            distributionPaths: ['/*'], // CloudFrontのキャッシュを無効にするパスを指定します。
        });
    }
}
