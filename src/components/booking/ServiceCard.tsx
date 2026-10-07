"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn, formatPrice } from "@/lib/utils";
import type { ServiceDto } from "@/types";
import { Clock, CheckCircle2 } from "lucide-react";

interface ServiceCardProps {
  service: ServiceDto;
  selected: boolean;
  onSelect: (service: ServiceDto) => void;
}

export function ServiceCard({ service, selected, onSelect }: ServiceCardProps) {
  return (
    <Card
      onClick={() => onSelect(service)}
      className={cn(
        "relative cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border-2",
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border hover:border-primary/40"
      )}
    >
      {selected && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="h-5 w-5 text-primary fill-primary/20" />
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 pr-7">
          <h3 className="font-semibold text-base leading-tight">{service.name}</h3>
          {service.category && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              {service.category}
            </Badge>
          )}
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
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{service.durationMinutes} min</span>
        </div>
        <span className="font-bold text-primary text-lg">
          {formatPrice(service.priceCents)}
        </span>
      </CardFooter>
    </Card>
  );
}
