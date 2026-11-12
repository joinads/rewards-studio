<?php
/** Behavioral tests for the custom update contract without a database or network. */
define('ABSPATH', '/wordpress/');
define('HOUR_IN_SECONDS', 3600);
define('MINUTE_IN_SECONDS', 60);
$GLOBALS['cache'] = array(); $GLOBALS['requests'] = 0; $GLOBALS['authorized'] = true; $GLOBALS['hooks'] = array();
function plugin_basename($file) { return 'joinads-reward-studio/' . basename($file); }
function add_filter($hook, $callback, $priority = 10, $args = 1) { $GLOBALS['hooks'][$hook] = $callback; }
function add_action($hook, $callback) { $GLOBALS['hooks'][$hook] = $callback; }
function get_site_transient($key) { return $GLOBALS['cache'][$key]['data'] ?? false; }
function set_site_transient($key, $value, $seconds) { $GLOBALS['cache'][$key] = array('data' => $value, 'ttl' => $seconds); }
function wp_safe_remote_get($url, $args) { if ($url !== Rewards_Studio_Updates::MANIFEST) throw new Exception('Unexpected URL'); $GLOBALS['requests']++; return $GLOBALS['response']; }
function is_wp_error($value) { return $value instanceof Exception; }
function wp_remote_retrieve_response_code($response) { return $response['status']; }
function wp_remote_retrieve_body($response) { return $response['body']; }
function current_user_can($cap) { return $GLOBALS['authorized']; }
function wp_die($message, $title, $args) { throw new Exception((string) $args['response']); }
function check_admin_referer($action) { if (empty($GLOBALS['nonce'])) throw new Exception('nonce'); }
function admin_url($path) { return 'https://site.test/wp-admin/' . $path; }
function wp_nonce_url($url, $action) { return $url . '&_wpnonce=test'; }
function esc_url($value) { return htmlspecialchars($value, ENT_QUOTES); }
function esc_html($value) { return htmlspecialchars($value, ENT_QUOTES); }
function wpautop($value) { return '<p>' . $value . '</p>'; }
require dirname(__DIR__) . '/joinads-reward-studio/includes/updates.php';
$tests = 0;
function expect($condition, $message) { global $tests; $tests++; if (!$condition) throw new Exception($message); }
function reset_cache() { $GLOBALS['cache'] = array(); }
function response($data, $status = 200) { reset_cache(); $GLOBALS['response'] = array('status' => $status, 'body' => is_string($data) ? $data : json_encode($data)); }
$release = array('slug' => 'joinads-reward-studio', 'version' => '0.3.3', 'download_url' => Rewards_Studio_Updates::package_url('0.3.3'), 'requires' => '6.6', 'requires_php' => '7.4', 'tested' => '7.1.4', 'changelog' => '<script>alert(1)</script>');
Rewards_Studio_Updates::register('/plugin/joinads-reward-studio.php');
expect(isset($GLOBALS['hooks']['update_plugins_github.com']), 'Native update filter registered');
expect(Rewards_Studio_Updates::validate($release) === $release, 'Valid manifest accepted');
foreach (array(array('download_url' => 'https://evil.test/plugin.zip'), array('slug' => 'other'), array('version' => '0.3.3-beta'), array('requires_php' => array()), array('changelog' => array())) as $invalid) expect(false === Rewards_Studio_Updates::validate(array_merge($release, $invalid)), 'Invalid manifest rejected');
response($release);
$update = Rewards_Studio_Updates::update(false, array('UpdateURI' => Rewards_Studio_Updates::REPOSITORY), 'joinads-reward-studio/joinads-reward-studio.php', array());
expect($update['version'] === '0.3.3' && $update['package'] === $release['download_url'], 'Newer release offered through native update contract');
expect(!array_key_exists('autoupdate', $update), 'Administrator auto-update preference preserved');
$requests = $GLOBALS['requests']; Rewards_Studio_Updates::release(); expect($GLOBALS['requests'] === $requests, 'Valid response cached');
expect($GLOBALS['cache'][Rewards_Studio_Updates::CACHE]['ttl'] === 10800, 'Success cache limited to three hours');
expect('unchanged' === Rewards_Studio_Updates::update('unchanged', array(), 'other/plugin.php', array()), 'Unrelated plugin untouched');
$info = Rewards_Studio_Updates::information(false, 'plugin_information', (object) array('slug' => 'joinads-reward-studio'));
expect($info->name === 'Rewards Studio by CORE ( JOINADS )', 'Official name in plugin details');
expect(strpos($info->sections['changelog'], '<script>') === false, 'Remote changelog escaped');
expect(Rewards_Studio_Updates::information('original', 'other_action', (object) array()) === 'original', 'Unrelated API requests untouched');
foreach (array('bad json', array('bad' => 'shape')) as $bad) { response($bad); expect(false === Rewards_Studio_Updates::release(), 'Malformed response fails safely'); }
response($release, 503); expect(false === Rewards_Studio_Updates::release(), 'HTTP error fails safely');
expect($GLOBALS['cache'][Rewards_Studio_Updates::CACHE]['ttl'] === 900, 'Failure cache expires sooner');
reset_cache(); $GLOBALS['response'] = new Exception('network'); expect(false === Rewards_Studio_Updates::release(), 'Network failure fails safely');
$GLOBALS['authorized'] = false;
expect(array() === Rewards_Studio_Updates::links(array()), 'Manual check link requires permission');
try { Rewards_Studio_Updates::check_now(); throw new Exception('Authorization missing'); } catch (Exception $e) { expect($e->getMessage() === '403', 'Manual refresh checks capability'); }
$GLOBALS['authorized'] = true;
try { Rewards_Studio_Updates::check_now(); throw new Exception('Nonce missing'); } catch (Exception $e) { expect($e->getMessage() === 'nonce', 'Manual refresh checks nonce'); }
echo "Updater: $tests assertions passed.\n";
