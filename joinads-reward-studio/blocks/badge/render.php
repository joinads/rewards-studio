<?php
defined('ABSPATH') || exit;
$icons = array('gift' => '✦', 'clock' => '◷', 'check' => '✓', 'fire' => '🔥', 'none' => '');
$icon = $icons[$attributes['icon'] ?? 'gift'] ?? $icons['gift'];
?>
<div <?php echo get_block_wrapper_attributes(array('class' => 'ja-badge')); ?>><span aria-hidden="true"><?php echo esc_html($icon); ?></span> <?php echo esc_html($attributes['label'] ?? 'Conteúdo exclusivo'); ?></div>
