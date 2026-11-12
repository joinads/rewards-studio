<?php
function get_block_wrapper_attributes($attrs = array()) { $result = ''; foreach ($attrs as $key => $value) $result .= ' ' . esc_attr($key) . '="' . esc_attr($value) . '"'; return $result; }
function esc_attr($value) { return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'); }
function esc_html($value) { return esc_attr($value); }
function sanitize_key($value) { return preg_replace('/[^a-z0-9_\-]/', '', strtolower($value)); }
define('ABSPATH', '/wordpress/');
function render_trigger($name, $attributes) { ob_start(); include dirname(__DIR__) . '/joinads-reward-studio/blocks/' . $name . '/render.php'; return ob_get_clean(); }
$n = 0;
function expect_render($value, $message) { global $n; $n++; if (!$value) throw new Exception($message); }
$audience = render_trigger('audience', array('label' => '<img onerror=bad> {count} agora', 'minimum' => 300, 'maximum' => 320, 'initial' => 9999, 'step' => 999, 'interval' => 1));
expect_render(strpos($audience, 'data-initial="320"') !== false, 'Initial clamped to range');
expect_render(strpos($audience, 'data-step="100"') !== false && strpos($audience, 'data-interval="1000"') !== false, 'Variation and frequency bounded');
expect_render(strpos($audience, '<img') === false && strpos($audience, '&lt;img') !== false, 'Audience label escaped');
expect_render(strpos($audience, 'data-simulated="true"') !== false, 'Simulation identified in markup');
$multi = render_trigger('audience', array('label' => '{count} / {count}'));
expect_render(substr_count($multi, 'data-ja-audience-value') === 2, 'Multiple count positions supported');
$action = render_trigger('action', array('action' => 'close', 'pulse' => 'strong', 'pulseDuration' => 999999));
expect_render(strpos($action, 'data-ja-pulse="none"') !== false, 'Close action does not pulse');
expect_render(strpos($action, '5000ms') !== false, 'Animation duration bounded');
$watch = render_trigger('action', array('pulse' => 'strong', 'pulseDuration' => 1500));
expect_render(strpos($watch, 'data-ja-pulse="strong"') !== false && strpos($watch, '1500ms') !== false, 'Watch pulse configured');
$clock = render_trigger('countdown', array('layout' => 'cards', 'urgentSeconds' => 99999, 'accentColor' => 'red;position:fixed', 'daysLabel' => '<script>bad</script>'));
expect_render(strpos($clock, 'data-layout="cards"') !== false && strpos($clock, 'data-urgent-seconds="3600"') !== false, 'Clock layout and threshold validated');
expect_render(strpos($clock, 'position:fixed') === false && strpos($clock, '<script>') === false, 'Clock labels and styles safe');
$old = render_trigger('countdown', array());
expect_render(strpos($old, 'data-layout="classic"') !== false && strpos($old, 'data-urgent-seconds="0"') !== false, 'Existing clocks retain default presentation without added urgency');
echo "Trigger renders: $n assertions passed.\n";
