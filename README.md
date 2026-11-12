# Rewards Studio by CORE ( JOINADS )

Editor visual de faces de reward para WordPress, integrado à tag do Core. A aparência fica no plugin; anúncio, prontidão, rebid, cooldown e concessão continuam no Core.

[Baixar a versão atual](https://github.com/joinads/rewards-studio/releases/latest/download/rewards-studio.zip) · [Releases e histórico](https://github.com/joinads/rewards-studio/releases)

## Instalação

1. Baixe **rewards-studio.zip** pelo link acima. Use o ZIP da release, não o “Source code” do GitHub.
2. No WordPress, abra **Plugins → Adicionar plugin → Enviar plugin** e envie o ZIP.
3. Se já usa uma versão anterior, escolha substituir a instalação existente. Faces, configurações e pasta técnica `joinads-reward-studio` são preservadas.
4. Ative o plugin. Requer WordPress 6.6+ e PHP 7.4+.
5. Mantenha no site a tag e o snippet de seleção de reward gerados no Install da JoinAds. O plugin não insere esses códigos por conta própria.

## Personalização

Em **Faces de reward**, crie uma face, informe o **Public ID (ULID)** do reward e publique. O ID deve coincidir com o reward selecionado pela tag no site. Opcionalmente, informe o valor exato de `?type=` para uma face por campanha; essa face tem prioridade sobre a face geral do mesmo reward.

Clique em **Abrir estúdio visual** nas configurações da face ou abra **Personalizar reward** na barra superior:

- **Formato:** Modal central, Tela cheia, Painel inferior ou Painel lateral. Um clique aplica a geometria no desktop e no celular, preservando cores, fontes e conteúdo.
- **Estilo:** paletas, cores, fundos, imagens e tipografia. Trocar a paleta preserva o formato.
- **Conteúdo:** clique em um elemento da prévia para editar título, texto, imagem, botão, aviso ou contador. Há atalhos para adicionar elementos. Estruturas mais complexas e reordenação continuam disponíveis no editor de blocos.
- **Mais:** todos os controles avançados, com busca por nome.

**Para tela cheia:** Estúdio visual → Formato → Tela cheia. O conteúdo fica centralizado com largura de leitura ajustável. Confira **Desktop** e **Celular**, clique em **Concluído** e salve a face no WordPress. A prévia não publica nem solicita anúncios.

Inclua ao menos um bloco **Ação do reward → Assistir anúncio**. O botão acompanha o estado de prontidão do botão original e encaminha o clique a ele. Fechamento também obedece ao Core.

### Nome e campanha

Use `{{person}}` e `{{type}}` nos textos. A URL `?person=Maria&type=viagens` personaliza a face no navegador, inclusive com cache de página. Os valores são limitados a 160 caracteres e entram apenas como texto, sem interpolação em HTML, URLs, estilos ou scripts. Há valores padrão por face.

### Urgência e contadores

O bloco **Contagem regressiva** aceita uma data/hora final, salva em UTC, ou duração de 1 minuto a 24 horas por visitante. A duração persiste em `localStorage` quando disponível; limpar os dados do navegador reinicia esse prazo. Sem armazenamento disponível, vale apenas a visita atual.

Ao terminar, mostra a mensagem configurada ou oculta somente o contador. Não bloqueia nem libera conteúdo e não altera a validade comercial da oferta no Core. O bloco **Aviso e destaque** permite comunicar informações reais da campanha. Nenhum bloco inventa estoque, visitantes ou prova social, e nenhum campo aceita JavaScript arbitrário.

## Atualizações pelo GitHub

A partir da **0.3.2**, o plugin ativo consulta o manifesto da última release pública pelo sistema nativo de atualização do WordPress. Não é necessário token do GitHub no site.

- Para atualizar manualmente, use **Atualizar agora** na lista de plugins.
- Para buscar antes da próxima checagem, use **Verificar atualizações** ao lado do plugin.
- Para instalar automaticamente, clique em **Ativar atualizações automáticas** na lista de plugins. A escolha do administrador é preservada; o plugin não força essa opção.
- Quem está na versão 0.3.1 ou anterior precisa instalar a 0.3.2 manualmente uma vez para receber o atualizador.

A checagem usa cache de até três horas. Se GitHub estiver indisponível ou responder com dados inválidos, o site segue funcionando e a consulta é tentada novamente depois. Apenas um ZIP da release estável deste repositório é aceito. O arquivo `SHA256SUMS` acompanha as releases para conferência manual.

## Compatibilidade com a tag

A versão 0.3.1 adicionou reconhecimento visual do Core 1.0.57 sem exigir um evento de renderização. A identificação exige:

1. Um único `rewardId` distinto em `window.JoinAdsRewards`.
2. O mesmo ID confirmado na configuração de `window.wrapper.config.rewards`.
3. Um único diálogo nativo compatível de tipo normal, block_modal ou block_drawer.
4. Face publicada correspondente e ausência de formulário/quiz nesse diálogo.

Se há ambiguidade, múltiplos diálogos, gatilhos AdRewarded coexistindo, tipo desconhecido ou falta de configuração confirmável, mantém a interface original. O standalone também é preservado. O evento explícito `joinads:reward-face`, quando disponibilizado pela tag, tem prioridade e permite identificar instâncias sem essa descoberta.

Quiz, captura de leads/push, entrega, raspadinha e cofre continuam com a interface nativa. Não há interceptação de `fetch`, GPT ou `JoinAdsRewards.push`.

Para diagnóstico no console, consulte `window.JoinAdsRewardStudioStatus`. `state: "mounted"` com `integration: "native-dom"` indica reconhecimento automático; `integration: "bridge"` indica o evento explícito. O objeto não contém nome ou parâmetros pessoais do visitante.

## Desenvolvimento e releases

```sh
npm ci --ignore-scripts
npm test
npm run test:updates
npm run lint
npm run package
```

`VERSION` é a versão canônica. Para publicar uma atualização:

```sh
npm run release:version -- 0.3.3
# Adicione as notas da versão no CHANGELOG.md.
npm run version:check
npm test
npm run test:updates
npm run lint
git add VERSION CHANGELOG.md package.json package-lock.json joinads-reward-studio
git commit -m "release: 0.3.3"
git push origin main
```

O comando de versão sincroniza o cabeçalho do plugin, a constante de runtime, o readme e os manifests npm. O GitHub Actions valida versões, roda os testes e empacota a release. Se a versão ainda não foi publicada, cria a tag `vX.Y.Z`, envia os assets e só então torna a release pública. Repetir um push sem aumentar a versão não substitui um ZIP publicado. Drafts incompletos podem ser retomados pelo workflow manual.

Assets públicos:

- `rewards-studio.zip`: plugin instalável, mantendo a pasta técnica anterior.
- `update.json`: manifesto usado pelo WordPress.
- `SHA256SUMS`: checksums do ZIP e do manifesto.

Os artefatos de desenvolvimento, capturas de tela e diagnósticos internos não entram no Git nem no ZIP. O pipeline usa apenas o `GITHUB_TOKEN` temporário do Actions; não exige secrets adicionais.

## Validação e limites

Os testes cobrem personalização segura, seleção de campanha, prioridade de integração, descoberta do modal, preservação do botão nativo, desmontagem, aparência e contadores. O atualizador tem testes PHP para validação do manifesto, cache, falhas de rede, isolamento de outros plugins, escaping e autorização da checagem manual.

A interface foi exercitada em WordPress local e no navegador com uma página real. Testes e prévias não comprovam venda ou entrega de anúncio: alterações devem também ser validadas em staging com a tag, consentimento e cache utilizados pelo site.

Licença: GPL-2.0-or-later.
