<?php
/**
 * Plugin Name: Rewards Studio by CORE ( JOINADS )
 * Description: Faces visuais para rewards JoinAds, com editor de blocos e personalização por campanha.
 * Version: 0.6.1
 * Requires at least: 6.6
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 * Plugin URI: https://github.com/joinads/rewards-studio
 * Author: CORE ( JOINADS )
 * Author URI: https://joinads.me
 * Update URI: https://github.com/joinads/rewards-studio
 * Text Domain: joinads-reward-studio
 */
defined('ABSPATH') || exit;

require_once __DIR__ . '/includes/updates.php';
Rewards_Studio_Updates::register(__FILE__);
require_once __DIR__ . '/includes/appearance.php';
require_once __DIR__ . '/includes/custom-css.php';
require_once __DIR__ . '/includes/patterns.php';

final class JoinAds_Reward_Studio {
    const TYPE = 'ja_reward_face';
    const VERSION = '0.6.1';
    private static $render_cache = array();

    public static function boot() {
        add_action('init', array(__CLASS__, 'register'));
        add_action('admin_post_ja_reward_preview', array(__CLASS__, 'preview'));
        add_action('enqueue_block_editor_assets', array(__CLASS__, 'editor_assets'));
        add_action('add_meta_boxes', array(__CLASS__, 'boxes'));
        add_action('save_post_' . self::TYPE, array(__CLASS__, 'save'));
        add_action('wp_enqueue_scripts', array(__CLASS__, 'assets'), 1);
        add_action('wp_footer', array(__CLASS__, 'templates'), 5);
        add_filter('use_block_editor_for_post_type', function ($enabled, $type) {
            return self::TYPE === $type ? true : $enabled;
        }, 10, 2);
    }

    public static function register() {
        register_post_type(self::TYPE, array(
            'labels' => array('name' => 'Reward Studio', 'menu_name' => 'Reward Studio', 'singular_name' => 'Face de reward', 'add_new_item' => 'Criar face de reward', 'edit_item' => 'Editar face de reward'),
            'public' => false, 'show_ui' => true, 'show_in_rest' => true,
            'menu_icon' => 'dashicons-art', 'supports' => array('title', 'editor', 'revisions', 'custom-fields'),
            'capabilities' => array_fill_keys(array('edit_post', 'read_post', 'delete_post', 'edit_posts', 'edit_others_posts', 'publish_posts', 'read_private_posts', 'delete_posts', 'delete_private_posts', 'delete_published_posts', 'delete_others_posts', 'edit_private_posts', 'edit_published_posts', 'create_posts'), 'manage_options'), 'map_meta_cap' => false,
            'template' => array(array('core/group', array('style' => array('spacing' => array('padding' => array('top' => '0px', 'right' => '0px', 'bottom' => '0px', 'left' => '0px')))), array(
                array('core/paragraph', array('content' => 'CONTEÚDO EXCLUSIVO')),
                array('core/heading', array('content' => '{{person}}, temos algo para você', 'level' => 2)),
                array('core/paragraph', array('content' => 'Veja um anúncio para acessar seu conteúdo de {{type}}.')),
                array('joinads/reward-action', array('label' => 'Assistir anúncio e continuar')),
                array('joinads/reward-action', array('label' => 'Agora não', 'action' => 'close')),
            ))),
        ));
        wp_register_style('ja-reward-studio-style', plugins_url('assets/frontend.css', __FILE__), array(), self::VERSION);
        wp_register_script('ja-reward-trigger-controls', plugins_url('assets/trigger-controls.js', __FILE__), array('wp-element', 'wp-components'), self::VERSION, true);
        wp_register_script('ja-reward-action-editor', plugins_url('assets/editor.js', __FILE__), array('wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'ja-reward-trigger-controls'), self::VERSION, true);
        foreach (array('action', 'countdown', 'badge', 'audience') as $block) register_block_type(__DIR__ . '/blocks/' . $block);
        JoinAds_Reward_Appearance::register(self::TYPE);
        JoinAds_Reward_Custom_CSS::register(self::TYPE);
        joinads_reward_register_patterns();
    }

    public static function design_assets() {
        wp_register_script('ja-reward-custom-css', plugins_url('assets/custom-css.js', __FILE__), array(), self::VERSION, true);
        wp_register_script('ja-reward-design', plugins_url('assets/design.js', __FILE__), array('ja-reward-custom-css'), self::VERSION, true);
        wp_add_inline_script('ja-reward-design', 'window.JoinAdsRewardDesignSchema=' . wp_json_encode(JoinAds_Reward_Appearance::schema()) . ';', 'before');
        wp_register_script('ja-reward-urgency', plugins_url('assets/urgency.js', __FILE__), array(), self::VERSION, true);
        wp_register_script('ja-reward-studio', plugins_url('assets/frontend.js', __FILE__), array('ja-reward-design', 'ja-reward-urgency'), self::VERSION, false);
    }

    public static function editor_assets() {
        global $post;
        if (!$post || self::TYPE !== $post->post_type || !current_user_can('manage_options')) return;
        self::design_assets();
        wp_enqueue_media();
        wp_enqueue_script('ja-reward-design');
        wp_enqueue_style('ja-reward-studio-style');
        wp_enqueue_style('ja-reward-studio-editor', plugins_url('assets/editor.css', __FILE__), array(), self::VERSION);
        wp_register_script('ja-reward-studio-order', plugins_url('assets/studio-order.js', __FILE__), array(), self::VERSION, true);
        wp_register_script('ja-reward-studio-layout', plugins_url('assets/studio-layout.js', __FILE__), array('ja-reward-studio-order'), self::VERSION, true);
        wp_enqueue_script('ja-reward-studio-sidebar', plugins_url('assets/sidebar.js', __FILE__), array('ja-reward-design', 'ja-reward-studio-layout', 'ja-reward-trigger-controls', 'wp-plugins', 'wp-editor', 'wp-edit-post', 'wp-data', 'wp-element', 'wp-components', 'wp-block-editor'), self::VERSION, true);
        wp_add_inline_script('ja-reward-studio-sidebar', 'window.JoinAdsRewardStudio=' . wp_json_encode(array(
            'postId' => $post->ID, 'nonce' => wp_create_nonce('ja_preview_' . $post->ID),
            'previewUrl' => admin_url('admin-post.php'),
        )) . ';', 'before');
    }

    public static function boxes() {
        add_meta_box('ja-reward-binding', 'Vincular ao Core JoinAds', array(__CLASS__, 'box'), self::TYPE, 'side');
    }

    public static function box($post) {
        wp_nonce_field('ja_reward_save', 'ja_reward_nonce');
        $fields = array('reward_id' => 'Public ID do reward (ULID)', 'campaign_type' => 'Campanha: valor exato de ?type= (vazio = todas)', 'person_fallback' => 'Nome quando ?person= estiver vazio', 'type_fallback' => 'Tipo quando ?type= estiver vazio', 'model_fallback' => 'Conteúdo quando ?model= estiver vazio (opcional)');
        foreach ($fields as $key => $label) {
            printf('<p><label for="ja-%1$s">%2$s</label><input class="widefat" id="ja-%1$s" name="ja_%1$s" value="%3$s" maxlength="%4$d"></p>', esc_attr($key), esc_html($label), esc_attr(get_post_meta($post->ID, '_ja_' . $key, true)), 'model_fallback' === $key ? 1000 : 160);
        }
        $preview = wp_nonce_url(admin_url('admin-post.php?action=ja_reward_preview&face=' . $post->ID), 'ja_preview_' . $post->ID);
        printf('<p><a class="button" href="%s" target="_blank" rel="noopener">Simular face salva</a></p>', esc_url($preview));
        echo '<p>Use <code>{{person}}</code>, <code>{{type}}</code> e <code>{{model}}</code> nos textos. Model é opcional. A correspondência de campanha tem prioridade sobre a face geral do mesmo reward. Publique para ativar. A tag atual pode ser reconhecida automaticamente quando existe um único reward compatível na página.</p>';
    }

    public static function save($id) {
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE || wp_is_post_revision($id) || !current_user_can('manage_options') || !current_user_can('edit_post', $id)) return;
        if (!isset($_POST['ja_reward_nonce']) || !is_string($_POST['ja_reward_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['ja_reward_nonce'])), 'ja_reward_save')) return;
        foreach (array('reward_id', 'campaign_type', 'person_fallback', 'type_fallback', 'model_fallback') as $key) {
            $value = isset($_POST['ja_' . $key]) && is_string($_POST['ja_' . $key]) ? mb_substr(sanitize_text_field(wp_unslash($_POST['ja_' . $key])), 0, 'model_fallback' === $key ? 1000 : 160) : '';
            if ('reward_id' === $key && $value && !preg_match('/^[0-9A-HJKMNP-TV-Z]{26}$/i', $value)) continue;
            update_post_meta($id, '_ja_' . $key, $value);
        }
    }

    private static function faces() {
        return get_posts(array('post_type' => self::TYPE, 'post_status' => 'publish', 'posts_per_page' => -1, 'orderby' => 'ID', 'order' => 'DESC'));
    }

    public static function assets() {
        if (is_admin() || !self::faces()) return;
        // Render early so block support styles and media dependencies exist before the head/footer style passes.
        foreach (self::faces() as $face) self::render_face($face);
        wp_enqueue_style('wp-block-library');
        wp_enqueue_style('ja-reward-studio-style');
        // Dependencies are promoted to the head with the listener so early native mounts are captured.
        self::design_assets();
        wp_enqueue_script('ja-reward-studio');
    }

    public static function preview() {
        $request = 'POST' === ($_SERVER['REQUEST_METHOD'] ?? '') ? $_POST : $_GET;
        $id = isset($request['face']) ? absint($request['face']) : 0;
        if (!current_user_can('manage_options')) wp_die('Acesso negado.', '', array('response' => 403));
        check_admin_referer('ja_preview_' . $id);
        $face = get_post($id);
        if (!$face || self::TYPE !== $face->post_type) wp_die('Face não encontrada.', '', array('response' => 404));
        $face = clone $face;
        $appearance = JoinAds_Reward_Appearance::get($id);
        $custom_css = JoinAds_Reward_Custom_CSS::get($id);
        if (isset($request['content']) && is_string($request['content'])) $face->post_content = wp_unslash($request['content']);
        if (isset($request['appearance']) && is_string($request['appearance'])) $appearance = JoinAds_Reward_Appearance::sanitize(json_decode(wp_unslash($request['appearance']), true));
        if (isset($request['custom_css']) && is_string($request['custom_css'])) $custom_css = JoinAds_Reward_Custom_CSS::sanitize(wp_unslash($request['custom_css']));
        $interactive = !empty($request['editor_preview']);
        $index = 0;
        $mark = function ($html, $block) use (&$index) {
            if (!in_array($block['blockName'] ?? '', array('core/heading', 'core/paragraph', 'core/image', 'joinads/reward-action', 'joinads/reward-countdown', 'joinads/reward-badge', 'joinads/reward-audience'), true)) return $html;
            $number = $index++;
            return preg_replace('/^(\s*<[a-zA-Z][a-zA-Z0-9:-]*)/', '$1 data-ja-edit-index="' . $number . '"', $html, 1);
        };
        if ($interactive) add_filter('render_block', $mark, 20, 2);
        ob_start();
        self::print_template($face, 'preview', $appearance, '', $custom_css);
        $template = ob_get_clean();
        if ($interactive) remove_filter('render_block', $mark, 20);
        $embedded = !empty($request['embedded']);
        $person = isset($request['person']) && is_string($request['person']) ? sanitize_text_field(wp_unslash($request['person'])) : '';
        $campaign = isset($request['type']) && is_string($request['type']) ? sanitize_text_field(wp_unslash($request['type'])) : '';
        $model = isset($request['model']) && is_string($request['model']) ? mb_substr(sanitize_text_field(wp_unslash($request['model'])), 0, 1000) : '';
        nocache_headers();
        header('Content-Type: text/html; charset=' . get_option('blog_charset'));
        wp_enqueue_style('wp-block-library');
        wp_enqueue_style('ja-reward-studio-style');
        self::design_assets();
        echo '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Simulador de reward</title>';
        wp_enqueue_global_styles();
        if (function_exists('wp_enqueue_stored_styles')) wp_enqueue_stored_styles();
        wp_print_styles();
        echo '<style>body{margin:0;background:#eef2f7;font:16px system-ui;color:#172033}.preview-toolbar{position:relative;z-index:10002;background:#fff;padding:12px 20px;border-bottom:1px solid #ddd;font-size:13px}form{display:flex;flex-wrap:wrap;gap:10px;align-items:end}input{padding:6px;max-width:160px}.preview-site{padding:48px;max-width:760px;margin:auto;color:#61708b}.preview-site i{display:block;height:18px;margin:20px 0;background:#dbe3ef;border-radius:8px}output{display:block} .ja-preview-status{position:fixed;bottom:0;left:0;right:0;padding:12px;background:#fff;z-index:10003}.ja-preview-status:empty{display:none}</style></head><body>';
        if (!$embedded) {
            echo '<header class="preview-toolbar"><p>Simulação da face salva · nenhum anúncio é solicitado.</p><form method="get">';
            foreach (array('action' => 'ja_reward_preview', 'face' => $id, '_wpnonce' => wp_create_nonce('ja_preview_' . $id)) as $key => $value) printf('<input type="hidden" name="%s" value="%s">', esc_attr($key), esc_attr($value));
            printf('<label>Nome / Base64 <input name="person" value="%s" maxlength="2048"></label><label>Campanha <input name="type" value="%s" maxlength="160"></label><label>Model (opcional) <input name="model" value="%s" maxlength="1000"></label>', esc_attr($person), esc_attr($campaign), esc_attr($model));
            echo '<button>Atualizar</button><button type="button" id="preview-gate">Simular anúncio carregando</button><button type="button" id="preview-reopen">Reabrir face</button></form></header>';
        }
        echo '<main class="preview-site"><h1>Uma página do seu site</h1><p>A face aparece sobre o conteúdo e usa o mesmo estilo da publicação.</p><i></i><i></i><i></i><i></i></main><div class="reward-modal-backdrop" data-ja-preview-overlay><div class="preview-card reward-modal" role="dialog" aria-label="Prévia"><section><h2>Interface nativa simulada</h2><button id="native-watch">Assistir</button><button id="native-close">Fechar</button></section></div></div><output class="ja-preview-status" aria-live="polite"></output>';
        echo $template;
        wp_print_scripts('ja-reward-studio');
        printf('<script>window.JoinAdsRewardPreview=%s;</script><script src="%s"></script>', wp_json_encode(array('person' => $person, 'type' => $campaign, 'model' => $model, 'interactive' => $interactive)), esc_url(plugins_url('assets/preview.js', __FILE__)));
        echo '</body></html>';
        exit;
    }

    public static function print_template($face, $reward, $appearance, $campaign, $custom_css = null) {
        if (null === $custom_css) $custom_css = JoinAds_Reward_Custom_CSS::get($face->ID);
        printf('<template data-ja-face data-face-id="%s" data-reward-id="%s" data-campaign-type="%s" data-person-fallback="%s" data-type-fallback="%s" data-appearance="%s" data-custom-css="%s" data-model-fallback="%s">', esc_attr($face->ID), esc_attr($reward), esc_attr($campaign), esc_attr(get_post_meta($face->ID, '_ja_person_fallback', true) ?: 'Visitante'), esc_attr(get_post_meta($face->ID, '_ja_type_fallback', true) ?: 'seu interesse'), esc_attr(wp_json_encode($appearance)), esc_attr($custom_css), esc_attr(get_post_meta($face->ID, '_ja_model_fallback', true)));
        echo self::render_face($face);
        echo '</template>';
    }

    public static function render_face($face) {
        $cache_key = $face->ID . ':' . md5($face->post_content);
        if (isset(self::$render_cache[$cache_key])) return self::$render_cache[$cache_key];
        $allowed = wp_kses_allowed_html('post');
        $allowed['button'] = array('type' => true, 'class' => true, 'data-ja-action' => true, 'disabled' => true, 'aria-label' => true, 'aria-busy' => true);
        self::$render_cache[$cache_key] = wp_kses(do_blocks($face->post_content), $allowed);
        return self::$render_cache[$cache_key];
    }

    public static function templates() {
        if (is_admin()) return;
        foreach (self::faces() as $face) {
            $reward = get_post_meta($face->ID, '_ja_reward_id', true);
            if (!$reward) continue;
            self::print_template($face, $reward, JoinAds_Reward_Appearance::get($face->ID), get_post_meta($face->ID, '_ja_campaign_type', true));
        }
    }
}
JoinAds_Reward_Studio::boot();
