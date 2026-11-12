<?php
/** Ready-to-edit layouts; each insertion creates ordinary, freely editable blocks. */
defined('ABSPATH') || exit;
function joinads_reward_register_patterns() {
    register_block_pattern_category('joinads-rewards', array('label' => 'JoinAds · Faces de reward'));
    $patterns = array(
        'welcome' => array('Boas-vindas personalizadas', '<!-- wp:joinads/reward-badge {"label":"Conteúdo exclusivo","icon":"gift"} /--><!-- wp:heading --><h2 class="wp-block-heading">{{person}}, seu próximo passo começa aqui</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Preparamos um conteúdo sobre {{type}} para você. Assista a um anúncio para continuar.</p><!-- /wp:paragraph --><!-- wp:joinads/reward-action {"icon":"play"} /-->'),
        'campaign' => array('Campanha com prazo', '<!-- wp:joinads/reward-badge {"label":"Prazo da campanha","icon":"clock"} /--><!-- wp:heading --><h2 class="wp-block-heading">{{person}}, confira os detalhes de {{type}}</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Adicione aqui as condições reais e os benefícios da sua campanha.</p><!-- /wp:paragraph --><!-- wp:joinads/reward-countdown {"mode":"deadline","label":"Encerramento da campanha"} /--><!-- wp:joinads/reward-action {"label":"Assistir anúncio e conferir","icon":"arrow"} /-->'),
        'split' => array('Imagem e conteúdo em colunas', '<!-- wp:columns --><div class="wp-block-columns"><!-- wp:column --><div class="wp-block-column"><!-- wp:image --><figure class="wp-block-image"><img alt=""/></figure><!-- /wp:image --></div><!-- /wp:column --><!-- wp:column --><div class="wp-block-column"><!-- wp:joinads/reward-badge {"label":"Feito para você","icon":"check"} /--><!-- wp:heading --><h2 class="wp-block-heading">Olá, {{person}}</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Conheça o conteúdo de {{type}}. Escolha uma imagem e personalize esta mensagem.</p><!-- /wp:paragraph --><!-- wp:joinads/reward-action {"icon":"play"} /--></div><!-- /wp:column --></div><!-- /wp:columns -->'),
    );
    foreach ($patterns as $slug => $pattern) register_block_pattern('joinads-rewards/' . $slug, array('title' => $pattern[0], 'categories' => array('joinads-rewards'), 'postTypes' => array(JoinAds_Reward_Studio::TYPE), 'content' => $pattern[1]));
}
