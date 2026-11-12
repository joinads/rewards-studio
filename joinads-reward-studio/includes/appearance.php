<?php
/** Canonical validation shared by REST meta, previews and public templates. */
defined('ABSPATH') || exit;
final class JoinAds_Reward_Appearance {
    const META = '_ja_appearance';
    public static function schema() {
        static $schema;
        if (null === $schema) $schema = json_decode(file_get_contents(dirname(__DIR__) . '/config/appearance.json'), true);
        return $schema;
    }
    public static function defaults() {
        return array_map(function ($field) { return $field['default']; }, self::schema()['fields']);
    }
    public static function sanitize($input) {
        $result = self::defaults();
        if (!is_array($input)) return $result;
        foreach (self::schema()['fields'] as $key => $field) {
            if (!array_key_exists($key, $input)) continue;
            $value = $input[$key];
            if ('number' === $field['type']) {
                if (is_numeric($value) && is_finite((float) $value)) $result[$key] = max($field['min'], min($field['max'], (float) $value));
            } elseif (is_string($value)) {
                if (isset($field['options'])) {
                    if (in_array($value, array_column($field['options'], 'value'), true)) $result[$key] = $value;
                } elseif ('color' === ($field['format'] ?? '')) {
                    if (preg_match('/^#[0-9a-f]{6}$/i', $value)) $result[$key] = strtolower($value);
                } elseif ('image' === ($field['format'] ?? '')) {
                    $result[$key] = esc_url_raw($value, array('http', 'https'));
                } elseif ('customFont' === $key) {
                    if (preg_match('/^[\p{L}\p{N} _.-]{1,80}$/u', $value)) $result[$key] = $value;
                } else {
                    $result[$key] = mb_substr(sanitize_text_field($value), 0, 120);
                }
            }
        }
        return $result;
    }
    public static function register($post_type) {
        $properties = array();
        foreach (self::schema()['fields'] as $key => $field) {
            $property = array('type' => $field['type'], 'default' => $field['default']);
            if ('number' === $field['type']) { $property['minimum'] = $field['min']; $property['maximum'] = $field['max']; }
            if (isset($field['options'])) $property['enum'] = array_column($field['options'], 'value');
            $properties[$key] = $property;
        }
        register_post_meta($post_type, self::META, array(
            'type' => 'object', 'single' => true, 'default' => self::defaults(), 'revisions_enabled' => true,
            'show_in_rest' => array('schema' => array('type' => 'object', 'properties' => $properties, 'additionalProperties' => false)),
            'sanitize_callback' => array(__CLASS__, 'sanitize'),
            'auth_callback' => function () { return current_user_can('manage_options'); },
        ));
    }
    public static function get($id) { return self::sanitize(get_post_meta($id, self::META, true)); }
}
