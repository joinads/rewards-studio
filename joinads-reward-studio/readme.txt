=== Rewards Studio by CORE ( JOINADS ) ===
Requires at least: 6.6
Requires PHP: 7.4
Stable tag: 0.5.0
License: GPLv2 or later

Editor de faces para rewards JoinAds. Usa os botões e o fluxo originais do Core.

== Uso ==
1. Abra Reward Studio e crie uma face.
2. Monte textos, imagens, colunas e botões com os blocos.
3. Clique em Abrir estúdio visual nas configurações da face ou abra Personalizar reward na barra superior.
4. Em Formato, escolha Modal central, Tela cheia, Painel inferior ou Painel lateral. Em Estilo, escolha as cores.
5. Adicione Ação do reward (Assistir anúncio). Vincule o Public ID (ULID) e, opcionalmente, a campanha.
6. Clique nos textos, imagens, botões e contadores da prévia para editar. Confira Desktop e Celular. Clique em Concluído para voltar ao WordPress.
7. Salve e publique quando estiver pronto.

Em Conteúdo da sua face, arraste os elementos ou use as setas para mudar a ordem. Alt + ↑/↓ também funciona no item selecionado. Grupos e atributos dos blocos são preservados e bloqueios do editor são respeitados.

Em Mais → Avançado, edite o CSS exclusivo da face, com prévia ao vivo, exemplos e validação. Use .ja-face para o conteúdo, .ja-face h2 para títulos, .ja-face-button para botões e .ja-designed-modal para a janela. Para substituir propriedades fixas da janela, use !important. Aceita @media, @supports e @keyframes; use seletores completos, sem aninhamento. Importações e outras regras globais não são aplicadas. Limite de 20.000 caracteres. Salve no WordPress para publicar o CSS junto à face. O CSS é retirado antes da entrega do anúncio.

A versão 0.3.1 reconhece a tag Core 1.0.57 sem exigir a ponte, quando existe um único reward na fila JoinAdsRewards confirmado pela configuração de window.wrapper.config.rewards e um único diálogo nativo compatível. Não interfere em cenários ambíguos, quiz, formulários ou no standalone. A ponte explícita continua sendo a integração preferida para múltiplos rewards.

== Personalização ==
{{person}} recebe ?person=Nome. {{type}} recebe ?type=campanha. Valores padrão podem ser definidos por face. Uma face com campanha exata tem prioridade sobre a face geral do mesmo reward.

== Contadores e destaques ==
Contagem regressiva aceita data/hora final ou prazo por visitante. Ao zerar, mostra uma mensagem ou oculta o contador. Não altera anúncio, recompensa ou validade da oferta no Core. O prazo por visitante persiste quando localStorage está disponível. Sem armazenamento, vale apenas a visita atual.

Aviso e destaque permite textos e ícones da campanha. Não gera estoque, visitantes ou depoimentos automaticamente.

== Escopo ==
Personaliza a oferta normal e os bloqueios modal/drawer. Quiz, captura e entrega continuam na interface nativa. Rebid, prontidão, cooldown e concessão seguem no Core. Alterações visuais são retiradas antes de encaminhar o clique ao botão nativo.

== Novos gatilhos visuais ==
Contagem de audiência (simulada): texto com {count}, valor inicial, mínimo, máximo, variação e intervalo editáveis. Layout em linha, selo ou cartão. Os números não representam visitantes reais medidos.

Contagem regressiva: layouts digital, blocos separados, compacto e faixa; tamanho, cores, cantos e rótulos editáveis; mensagem e destaque opcionais nos últimos segundos.

Botão de anúncio: pulsação suave ou forte e velocidade entre 0,8 e 5 segundos. Só pulsa quando o anúncio está pronto. Não muda a ação do botão nem a espera, e respeita movimento reduzido.

== Atualizações ==
Releases oficiais: https://github.com/joinads/rewards-studio/releases
Download: https://github.com/joinads/rewards-studio/releases/latest/download/rewards-studio.zip
A partir da versão 0.3.2, o plugin ativo consulta as releases públicas pelo sistema nativo de atualizações do WordPress. Use Verificar atualizações na lista de plugins para antecipar a consulta. Para instalação automática, ative Ativar atualizações automáticas no WordPress. Nenhum token do GitHub é necessário no site. Quem está na versão 0.3.1 ou anterior precisa instalar a 0.3.2 manualmente uma vez.

== Changelog ==
= 0.5.0 =
Menu Reward Studio, reordenação por arrastar/setas/teclado e Mais → Avançado com editor CSS por face, exemplos e prévia ao vivo. Preserva o fluxo nativo do anúncio.
= 0.4.0 =
Contagem de audiência simulada, quatro layouts para o relógio, opções de destaque no final do prazo e pulsação do botão, com os mesmos controles no estúdio e nos blocos.
= 0.3.2 =
Nome oficial Rewards Studio by CORE ( JOINADS ), atualizador via releases públicas do GitHub e distribuição automática por versão.
= 0.3.1 =
Compatibilidade com Core 1.0.57 sem o evento de integração. Identificação por snippet, configuração da tag e diálogo nativo. Preserva o botão, o gate e todo o ciclo do anúncio. Diagnóstico em window.JoinAdsRewardStudioStatus. Corrige o caso verificado em creditoluz.com.
= 0.3.0 =
Estúdio amplo com prévia interativa, formatos e paletas separados, tela cheia de um clique para desktop/celular, edição de conteúdo por clique, adição rápida, busca avançada e desfazer aparência. A prévia de edição seleciona os elementos sem acionar o anúncio.
= 0.2.0 =
Painel completo de aparência, celular, presets, padrões, prévia ao vivo, ícones e variantes de botões, contador e avisos.
= 0.1.0 =
Editor de faces e ponte inicial com o Core.
