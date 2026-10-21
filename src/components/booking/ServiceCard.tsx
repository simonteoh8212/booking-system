"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn, formatPrice, getServiceImage } from "@/lib/utils";
import Image from "next/image";
import { useCustomerLanguage } from "./CustomerLanguageContext";
import type { ServiceDto } from "@/types";
import { Clock, CheckCircle2 } from "lucide-react";

interface ServiceCardProps {
  service: ServiceDto;
  selected: boolean;
  onSelect: (service: ServiceDto) => void;
  currencySymbol?: string;
}

export function ServiceCard({
  service,
  selected,
  onSelect,
  currencySymbol = "RM",
}: ServiceCardProps) {
  const { language, t } = useCustomerLanguage();
  const svcImage = getServiceImage(service.name);

  return (
    <Card
      onClick={() => onSelect(service)}
      className={cn(
        "relative cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border-2 rounded-2xl",
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border hover:border-primary/40 bg-card"
      )}
    >
      {selected && (
        <div className="absolute top-3.5 right-3.5 z-10">
          <CheckCircle2 className="h-5 w-5 text-primary fill-primary/20" />
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          {svcImage && (
            <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 border border-border/60 bg-muted/40 shadow-2xs p-1.5 flex items-center justify-center">
              <Image
                src={svcImage}
                alt={service.name}
                fill
                unoptimized
                className="object-contain drop-shadow-xs"
                sizes="(max-width: 640px) 72px, 80px"
              />
            </div>
          )}
          <div className="flex-1 min-w-0 pr-7">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-base leading-tight text-foreground">{service.name}</h3>
              {service.category && (
                <Badge variant="secondary" className="shrink-0 text-xs font-semibold">
                  {service.category}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {service.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {service.description}
          </p>
        )}
      </CardContent>

      <CardFooter className="pt-0 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {service.durationMinutes} {t.step1.minUnit[language]}
          </span>
        </div>
        <span className="font-black text-primary text-lg tabular-nums">
          {formatPrice(service.priceCents, currencySymbol)}
        </span>
      </CardFooter>
    </Card>
  );
}
