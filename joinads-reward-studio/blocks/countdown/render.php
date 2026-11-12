<?php
defined('ABSPATH') || exit;
$mode = 'duration' === ($attributes['mode'] ?? '') ? 'duration' : 'deadline';
$seconds = max(60, min(86400, (int) ($attributes['seconds'] ?? 900)));
$deadline = isset($attributes['deadline']) && is_string($attributes['deadline']) ? strtotime($attributes['deadline']) : false;
$expiry = 'hide' === ($attributes['expiry'] ?? '') ? 'hide' : 'message';
$layout = in_array($attributes['layout'] ?? '', array('classic', 'cards', 'compact', 'ribbon'), true) ? $attributes['layout'] : 'classic';
$size = max(18, min(72, (int) ($attributes['digitSize'] ?? 34)));
$radius = max(0, min(40, (int) ($attributes['clockRadius'] ?? 12)));
$urgent = max(0, min(3600, (int) ($attributes['urgentSeconds'] ?? 0)));
$color = function ($key, $fallback) use ($attributes) { $value = $attributes[$key] ?? ''; return preg_match('/^#[0-9a-f]{6}$/i', $value) ? $value : $fallback; };
$styles = '--ja-clock-size:' . $size . 'px;--ja-clock-radius:' . $radius . 'px;--ja-clock-accent:' . $color('accentColor', '#ef4444') . ';--ja-clock-unit-bg:' . $color('unitBackground', '#ffffff') . ';--ja-clock-unit-color:' . $color('unitColor', '#172033');
?>
<div <?php echo get_block_wrapper_attributes(array('class' => 'ja-countdown', 'style' => $styles)); ?> data-ja-countdown data-layout="<?php echo esc_attr($layout); ?>" data-show-days="<?php echo !empty($attributes['showDays']) ? 'true' : 'false'; ?>" data-urgent-seconds="<?php echo esc_attr($urgent); ?>" data-urgent-pulse="<?php echo !empty($attributes['urgentPulse']) ? 'true' : 'false'; ?>" data-mode="<?php echo esc_attr($mode); ?>" data-seconds="<?php echo esc_attr($seconds); ?>" data-deadline="<?php echo esc_attr($deadline ? gmdate('c', $deadline) : ''); ?>" data-timer-id="<?php echo esc_attr(sanitize_key($attributes['timerId'] ?? '')); ?>" data-expiry="<?php echo esc_attr($expiry); ?>" data-expired-label="<?php echo esc_attr($attributes['expiredLabel'] ?? 'O prazo informado terminou.'); ?>">
 <p class="ja-countdown-label"><?php echo esc_html($attributes['label'] ?? 'Prazo da campanha'); ?></p>
 <div class="ja-countdown-clock" role="timer" aria-label="Tempo restante" aria-live="off"><span data-ja-countdown-value>— : — : —</span><span class="ja-countdown-units" aria-hidden="true"><?php foreach (array('days' => 'Dias', 'hours' => 'Horas', 'minutes' => 'Min', 'seconds' => 'Seg') as $unit => $unit_label) : ?><span class="ja-countdown-unit" data-ja-unit="<?php echo esc_attr($unit); ?>"><strong data-ja-unit-value>00</strong><small><?php echo esc_html($attributes[$unit . 'Label'] ?? $unit_label); ?></small></span><?php endforeach; ?></span></div>
 <p data-ja-countdown-urgent hidden><?php echo esc_html($attributes['urgentLabel'] ?? 'O prazo está terminando'); ?></p>
 <p data-ja-countdown-status role="status" hidden><?php echo esc_html($attributes['expiredLabel'] ?? 'O prazo informado terminou.'); ?></p>
</div>
