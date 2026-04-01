

## Sistema de Seleção de Fotos para Eventos

### Visão Geral
Aplicação completa para fotógrafos de eventos exibirem galerias de fotos online, onde clientes selecionam suas fotos preferidas antes da edição. Interface 100% em português brasileiro, mobile-first, otimizada para 1000+ fotos por evento.

### Stack
- **Frontend**: React + Tailwind CSS (mobile-first)
- **Backend**: Lovable Cloud (Supabase) — banco de dados, autenticação, storage
- **Compressão**: Client-side com browser-image-compression (thumbnail + preview no upload)

### Estrutura do Banco de Dados

1. **events** — id, nome, slug (URL amigável), data, preço por foto, status (ativo/inativo), created_at
2. **event_photos** — id, event_id, storage_path (original), thumbnail_path, preview_path, photo_code (ex: #A102), order, created_at
3. **selections** — id, event_id, whatsapp, status (pendente/editando/entregue), total_photos, total_price, created_at
4. **selection_photos** — id, selection_id, photo_id

### Páginas e Funcionalidades

#### 1. Galeria Pública (`/evento/:slug`)
- Grid responsivo de thumbnails com lazy loading (Intersection Observer)
- Cada foto exibe seu código único (#A102) como overlay
- Watermark via CSS overlay (texto semi-transparente sobre cada imagem)
- Toque/clique para selecionar (ícone de coração/check com animação)
- Barra fixa no rodapé: contador de fotos selecionadas + botão "Finalizar Seleção"
- Carrega apenas thumbnails (~50KB cada); preview maior ao expandir

#### 2. Modal de Visualização
- Ao tocar numa foto, abre preview maior (ainda não full-res)
- Swipe lateral para navegar entre fotos
- Botão de selecionar/desfavoritar dentro do modal

#### 3. Checkout / Finalização (`/evento/:slug/finalizar`)
- Resumo: lista de códigos das fotos selecionadas, quantidade total, preço total
- Campo para WhatsApp (com máscara brasileira)
- Botão "Enviar via WhatsApp" — abre `wa.me` com mensagem pré-formatada contendo o resumo
- Salva a seleção no banco de dados

#### 4. Painel Admin (`/admin`) — protegido por login
- **Login**: email/senha via Supabase Auth
- **Dashboard**: lista de eventos com contagem de seleções
- **Gestão de Eventos**: criar/editar eventos (nome, slug, preço por foto)
- **Upload de Fotos**: upload em lote com compressão automática no navegador
  - Gera 3 versões: thumbnail (300px), preview (1200px), original
  - Atribui código automático sequencial (#A001, #A002...)
  - Barra de progresso para uploads em lote
- **Pedidos/Seleções**: lista de todas as seleções por evento
  - Filtro por evento e status
  - Exibe: WhatsApp, fotos selecionadas, status, data
  - Alterar status (pendente → editando → entregue)

### Storage (Supabase)
- Bucket `event-photos` com pastas: `/{event_id}/originals/`, `/{event_id}/previews/`, `/{event_id}/thumbnails/`
- Bucket público para thumbnails/previews, privado para originais

### Performance (1000+ fotos)
- Thumbnails comprimidas (~50KB, 300px largura)
- Lazy loading com Intersection Observer
- Paginação virtual ou "carregar mais" a cada 50 fotos
- Estado de seleção gerenciado localmente (localStorage + sync com DB no checkout)

### UX Mobile-First
- Botões grandes (min 44px touch target)
- Grid de 2 colunas no mobile, 3-4 no desktop
- Barra de seleção fixa no rodapé sempre visível
- Feedback visual imediato ao selecionar (animação + badge)

