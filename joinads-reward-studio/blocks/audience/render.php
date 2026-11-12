<?php
defined('ABSPATH') || exit;
$minimum = max(0, min(1000000, (int) ($attributes['minimum'] ?? 300)));
$maximum = max($minimum, min(1000000, (int) ($attributes['maximum'] ?? 360)));
$initial = max($minimum, min($maximum, (int) ($attributes['initial'] ?? 328)));
$step = max(1, min(100, (int) ($attributes['step'] ?? 5)));
$interval = max(1000, min(60000, (int) ($attributes['interval'] ?? 4000)));
$layout = in_array($attributes['layout'] ?? '', array('inline', 'badge', 'card'), true) ? $attributes['layout'] : 'badge';
$accent = preg_match('/^#[0-9a-f]{6}$/i', $attributes['accentColor'] ?? '') ? $attributes['accentColor'] : '#16a34a';
$label = $attributes['label'] ?? '{count} watching now';
if (false === strpos($label, '{count}')) $label .= ' {count}';
$parts = explode('{count}', $label);
?>
<div <?php echo get_block_wrapper_attributes(array('class' => 'ja-audience', 'style' => '--ja-audience-accent:' . $accent)); ?> data-ja-audience data-simulated="true" data-layout="<?php echo esc_attr($layout); ?>" data-initial="<?php echo esc_attr($initial); ?>" data-minimum="<?php echo esc_attr($minimum); ?>" data-maximum="<?php echo esc_attr($maximum); ?>" data-step="<?php echo esc_attr($step); ?>" data-interval="<?php echo esc_attr($interval); ?>" aria-live="off">
<?php if (!isset($attributes['indicator']) || $attributes['indicator']) : ?><span class="ja-audience-dot" aria-hidden="true"></span><?php endif; ?>
<span class="ja-audience-copy"><?php foreach ($parts as $index => $part) { if ($index) echo '<strong data-ja-audience-value>' . esc_html($initial) . '</strong>'; echo esc_html($part); } ?></span>
</div>
