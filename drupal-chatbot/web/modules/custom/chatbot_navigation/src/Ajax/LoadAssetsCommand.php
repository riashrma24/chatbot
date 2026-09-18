<?php

namespace Drupal\chatbot_navigation\Ajax;

use Drupal\Core\Ajax\CommandInterface;

class LoadAssetsCommand implements CommandInterface
{
    protected array $css;
    protected array $js;
    protected array $inlineCss;
    protected array $inlineJs;

    public function __construct(array $css, array $js, array $inlineCss = [], array $inlineJs = [])
    {
        $this->css = $css;
        $this->js = $js;
        $this->inlineCss = $inlineCss;
        $this->inlineJs = $inlineJs;
    }

    public function render()
    {
        return [
            'command' => 'loadAssets',
            'css' => $this->css,
            'js' => $this->js,
            'inlineCss' => $this->inlineCss,
            'inlineJs' => $this->inlineJs,
        ];
    }
}
