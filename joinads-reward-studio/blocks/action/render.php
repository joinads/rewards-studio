<?php
/** Server-rendered reward action. */
defined('ABSPATH') || exit;
$action = isset($attributes['action']) && 'close' === $attributes['action'] ? 'close' : 'watch';
$variant = in_array($attributes['variant'] ?? '', array('primary', 'secondary', 'text'), true) ? $attributes['variant'] : ('close' === $action ? 'text' : 'primary');
$icons = array('none' => '', 'play' => '▶', 'lock' => '▣', 'arrow' => '→', 'gift' => '✦');
$icon = $icons[$attributes['icon'] ?? 'none'] ?? '';
?>
<div <?php echo get_block_wrapper_attributes(array('data-ja-variant' => $variant)); ?>>
<button type="button" data-ja-action="<?php echo esc_attr($action); ?>" class="ja-face-button"><?php if ($icon) : ?><span class="ja-face-icon" aria-hidden="true"><?php echo esc_html($icon); ?></span><?php endif; ?><span data-ja-label><?php echo esc_html($attributes['label'] ?? 'Assistir anúncio e continuar'); ?></span></button>
</div>
