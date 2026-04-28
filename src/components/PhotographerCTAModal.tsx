import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Briefcase, HelpCircle, Tag, ArrowRight, MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '5588981364971';

const buildWhatsAppUrl = (message: string) => {
  const encoded = encodeURIComponent(message);
  // wa.me works on desktop & mobile; WhatsApp app intercepts on devices.
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
};

const options = [
  {
    icon: Briefcase,
    title: 'Quero usar a plataforma no meu negócio',
    description: 'Começar a vender minhas fotos com galerias profissionais.',
    message:
      'Olá! Sou fotógrafo e quero usar a plataforma FotoPedido no meu negócio. Pode me ajudar a começar?',
  },
  {
    icon: HelpCircle,
    title: 'Quero entender como funciona',
    description: 'Conhecer o fluxo, recursos e diferenciais da plataforma.',
    message:
      'Olá! Sou fotógrafo e gostaria de entender como funciona a plataforma FotoPedido.',
  },
  {
    icon: Tag,
    title: 'Quero informações de preço',
    description: 'Saber sobre planos, valores e condições comerciais.',
    message:
      'Olá! Sou fotógrafo e gostaria de informações sobre os preços e planos da plataforma FotoPedido.',
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PhotographerCTAModal = ({ open, onOpenChange }: Props) => {
  const handleSelect = (message: string) => {
    const url = buildWhatsAppUrl(message);
    window.open(url, '_blank', 'noopener,noreferrer');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg surface-premium border hairline p-0 overflow-hidden">
        <div className="p-6 sm:p-8">
          <DialogHeader className="text-left space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border hairline bg-card/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary-soft w-fit">
              <MessageCircle className="h-3 w-3" />
              Atendimento direto
            </div>
            <DialogTitle className="font-display text-3xl text-foreground leading-tight">
              É fotógrafo?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Conte rapidamente o que procura. Vamos continuar pelo WhatsApp com a resposta certa para você.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-2.5">
            {options.map(({ icon: Icon, title, description, message }) => (
              <button
                key={title}
                type="button"
                onClick={() => handleSelect(message)}
                className="group w-full text-left flex items-start gap-4 p-4 rounded-md border hairline bg-card/40 hover:bg-card hover:border-primary/50 transition-all duration-200"
              >
                <div className="shrink-0 h-10 w-10 rounded-md border hairline bg-background/60 flex items-center justify-center group-hover:border-primary/50 group-hover:bg-primary/10 transition-colors">
                  <Icon className="h-4 w-4 text-primary-soft group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1" />
              </button>
            ))}
          </div>

          <p className="mt-5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 text-center">
            Resposta rápida em horário comercial
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotographerCTAModal;