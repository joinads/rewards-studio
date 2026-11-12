<?php
defined('ABSPATH') || exit;
$mode = 'duration' === ($attributes['mode'] ?? '') ? 'duration' : 'deadline';
$seconds = max(60, min(86400, (int) ($attributes['seconds'] ?? 900)));
$deadline = isset($attributes['deadline']) && is_string($attributes['deadline']) ? strtotime($attributes['deadline']) : false;
$expiry = 'hide' === ($attributes['expiry'] ?? '') ? 'hide' : 'message';
?>
<div <?php echo get_block_wrapper_attributes(array('class' => 'ja-countdown')); ?> data-ja-countdown data-mode="<?php echo esc_attr($mode); ?>" data-seconds="<?php echo esc_attr($seconds); ?>" data-deadline="<?php echo esc_attr($deadline ? gmdate('c', $deadline) : ''); ?>" data-timer-id="<?php echo esc_attr(sanitize_key($attributes['timerId'] ?? '')); ?>" data-expiry="<?php echo esc_attr($expiry); ?>" data-expired-label="<?php echo esc_attr($attributes['expiredLabel'] ?? 'O prazo informado terminou.'); ?>">
 <p class="ja-countdown-label"><?php echo esc_html($attributes['label'] ?? 'Prazo da campanha'); ?></p>
 <div class="ja-countdown-clock" role="timer" aria-label="Tempo restante" aria-live="off"><span data-ja-countdown-value>— : — : —</span></div>
 <p data-ja-countdown-status role="status" hidden><?php echo esc_html($attributes['expiredLabel'] ?? 'O prazo informado terminou.'); ?></p>
</div>
