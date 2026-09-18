<?php

namespace Drupal\chatbot_navigation\Controller;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Ajax\ReplaceCommand;
use Drupal\Core\Controller\ControllerBase;
use Drupal\chatbot_navigation\Ajax\LoadAssetsCommand;
use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\GuzzleException;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\HttpKernelInterface;

class NavigationController extends ControllerBase
{
    protected HttpKernelInterface $httpKernel;
    protected ClientInterface $httpClient;

    public function __construct(HttpKernelInterface $httpKernel, ClientInterface $httpClient)
    {
        $this->httpKernel = $httpKernel;
        $this->httpClient = $httpClient;
    }

    public static function create(ContainerInterface $container)
    {
        return new static(
            $container->get('http_kernel'),
            $container->get('http_client')
        );
    }

    public function navigate(Request $request)
    {
        $path = $request->query->get('path');

        if (!$path) {
            return new AjaxResponse();
        }

        $subRequest = Request::create($path);

        $response = $this->httpKernel->handle(
            $subRequest,
            HttpKernelInterface::SUB_REQUEST
        );

        $html = $response->getContent();

        preg_match(
    '/<main\s+id=[\'"]main-content[\'"][^>]*>.*?<\/main>/s',
    $html,
    $matches
);

        if (!isset($matches[0])) {
            return new AjaxResponse();
        }

        $ajaxResponse = new AjaxResponse();

        $ajaxResponse->addCommand(
            new ReplaceCommand(
                '#main-content',
                $matches[0]
            )
        );

        $targetUrl = $request->getSchemeAndHttpHost() . $path;
        [$css, $js, $inlineCss, $inlineJs] = $this->crawlAssets($targetUrl, $html);

        $ajaxResponse->addCommand(
            new LoadAssetsCommand($css, $js, $inlineCss, $inlineJs)
        );

        return $ajaxResponse;
    }


    protected function crawlAssets(string $url, string $html): array
    {
        $crawlerUrl = getenv('ASSET_CRAWLER_URL') ?: 'http://127.0.0.1:4000/crawl';

        try {
            $response = $this->httpClient->request('POST', $crawlerUrl, [
                'json' => ['url' => $url],
                'timeout' => 15,
            ]);

            $data = json_decode((string) $response->getBody(), true);

            return [
                $data['css'] ?? [],
                $data['js'] ?? [],
                $data['inlineCss'] ?? [],
                $data['inlineJs'] ?? [],
            ];
        } catch (GuzzleException $e) {
            \Drupal::logger('chatbot_navigation')->warning(
                'Asset crawler unreachable, falling back to static extraction: @message',
                ['@message' => $e->getMessage()]
            );

            [$css, $js] = $this->extractAssets($html);

            return [$css, $js, [], []];
        }
    }

    protected function extractAssets(string $html): array
    {
        $css = [];
        preg_match_all('/<link\b[^>]*>/i', $html, $linkTags);

        foreach ($linkTags[0] as $tag) {
            if (
                preg_match('/rel=["\']stylesheet["\']/i', $tag) &&
                preg_match('/href=["\']([^"\']+)["\']/i', $tag, $hrefMatch)
            ) {
                $css[] = html_entity_decode($hrefMatch[1]);
            }
        }

        $js = [];
        preg_match_all(
            '/<script\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*>/i',
            $html,
            $scriptTags
        );

        foreach ($scriptTags[1] as $src) {
            $js[] = html_entity_decode($src);
        }

        return [
            array_values(array_unique($css)),
            array_values(array_unique($js)),
        ];
    }
}