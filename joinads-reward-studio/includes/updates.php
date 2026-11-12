<?php
/** Native WordPress updates backed by public GitHub Release assets. */
defined('ABSPATH') || exit;
final class Rewards_Studio_Updates {
    const REPOSITORY = 'https://github.com/joinads/rewards-studio';
    const MANIFEST = 'https://github.com/joinads/rewards-studio/releases/latest/download/update.json';
    const CACHE = 'rewards_studio_release_v1';
    private static $plugin_file;

    public static function register($file) {
        self::$plugin_file = plugin_basename($file);
        add_filter('update_plugins_github.com', array(__CLASS__, 'update'), 10, 4);
        add_filter('plugins_api', array(__CLASS__, 'information'), 10, 3);
        add_filter('plugin_action_links_' . self::$plugin_file, array(__CLASS__, 'links'));
        add_action('admin_post_rewards_studio_check_updates', array(__CLASS__, 'check_now'));
    }

    public static function package_url($version) {
        return self::REPOSITORY . '/releases/download/v' . $version . '/rewards-studio.zip';
    }

    public static function validate($data) {
        if (!is_array($data) || 'joinads-reward-studio' !== ($data['slug'] ?? null)) return false;
        if (!isset($data['version']) || !is_string($data['version']) || !preg_match('/^\d+\.\d+\.\d+$/D', $data['version'])) return false;
        if (self::package_url($data['version']) !== ($data['download_url'] ?? null)) return false;
        foreach (array('requires', 'requires_php', 'tested') as $key) {
            if (!isset($data[$key]) || !is_string($data[$key]) || !preg_match('/^\d+\.\d+(?:\.\d+)?$/D', $data[$key])) return false;
        }
        if (isset($data['changelog']) && !is_string($data['changelog'])) return false;
        return $data;
    }

    public static function release() {
        $cached = get_site_transient(self::CACHE);
        if (is_array($cached) && array_key_exists('release', $cached)) return $cached['release'];
        $response = wp_safe_remote_get(self::MANIFEST, array(
            'timeout' => 8, 'redirection' => 5, 'limit_response_size' => 131072,
            'headers' => array('Accept' => 'application/json'),
        ));
        $release = false;
        if (!is_wp_error($response) && 200 === wp_remote_retrieve_response_code($response)) {
            $release = self::validate(json_decode(wp_remote_retrieve_body($response), true));
        }
        // Cache failures briefly; neither a GitHub outage nor invalid JSON breaks the site.
        set_site_transient(self::CACHE, array('release' => $release), $release ? 3 * HOUR_IN_SECONDS : 15 * MINUTE_IN_SECONDS);
        return $release;
    }

    public static function update($update, $plugin_data, $plugin_file, $locales) {
        if (self::$plugin_file !== $plugin_file || self::REPOSITORY !== ($plugin_data['UpdateURI'] ?? '')) return $update;
        $release = self::release();
        if (!$release) return $update;
        // WordPress compares versions and maintains response/no_update itself.
        // Auto-updates use the administrator's native setting; never force-enable them.
        return array(
            'id' => self::REPOSITORY, 'slug' => 'joinads-reward-studio', 'version' => $release['version'],
            'url' => self::REPOSITORY . '/releases/tag/v' . $release['version'],
            'package' => $release['download_url'], 'requires' => $release['requires'],
            'requires_php' => $release['requires_php'], 'tested' => $release['tested'],
        );
    }

    public static function information($result, $action, $args) {
        if ('plugin_information' !== $action || !is_object($args) || 'joinads-reward-studio' !== ($args->slug ?? '')) return $result;
        $release = self::release();
        if (!$release) return $result;
        return (object) array(
            'name' => 'Rewards Studio by CORE ( JOINADS )', 'slug' => 'joinads-reward-studio',
            'version' => $release['version'], 'author' => 'CORE ( JOINADS )', 'homepage' => self::REPOSITORY,
            'requires' => $release['requires'], 'requires_php' => $release['requires_php'], 'tested' => $release['tested'],
            'download_link' => $release['download_url'],
            'sections' => array(
                'description' => '<p>Editor visual de faces de reward, com personalização por campanha e integração ao fluxo nativo do Core.</p>',
                'changelog' => wpautop(esc_html($release['changelog'] ?? 'Consulte as notas da release no GitHub.')),
            ),
        );
    }

    public static function links($links) {
        if (current_user_can('update_plugins')) {
            $url = wp_nonce_url(admin_url('admin-post.php?action=rewards_studio_check_updates'), 'rewards_studio_check_updates');
            $links[] = '<a href="' . esc_url($url) . '">Verificar atualizações</a>';
        }
        return $links;
    }

    public static function check_now() {
        if (!current_user_can('update_plugins')) wp_die('Acesso negado.', '', array('response' => 403));
        check_admin_referer('rewards_studio_check_updates');
        delete_site_transient(self::CACHE);
        delete_site_transient('update_plugins');
        wp_update_plugins();
        wp_safe_redirect(admin_url('plugins.php'));
        exit;
    }
}
