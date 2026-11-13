<?php
/** Per-face CSS. Parsed and scoped by the browser before it is ever applied. */
defined('ABSPATH') || exit;
final class JoinAds_Reward_Custom_CSS {
    const META = '_ja_custom_css';
    const LIMIT = 20000;
    public static function sanitize($value) {
        if (!is_string($value)) return '';
        return mb_substr(str_replace(array("\r\n", "\r", "\0"), array("\n", "\n", ''), $value), 0, self::LIMIT);
    }
    public static function register($post_type) {
        register_post_meta($post_type, self::META, array(
            'type' => 'string', 'single' => true, 'default' => '', 'revisions_enabled' => true,
            'show_in_rest' => array('schema' => array('type' => 'string', 'maxLength' => self::LIMIT)),
            'sanitize_callback' => array(__CLASS__, 'sanitize'),
            'auth_callback' => function () { return current_user_can('manage_options'); },
        ));
    }
    public static function get($id) { return self::sanitize(get_post_meta($id, self::META, true)); }
}
