"use client";

import { useBookingStore } from "@/stores/bookingStore";
import { ServiceCard } from "./ServiceCard";
import type { ServiceDto } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

interface StepServiceSelectProps {
  services: ServiceDto[];
}

// Group services by category
function groupByCategory(services: ServiceDto[]) {
  const map = new Map<string, ServiceDto[]>();
  for (const s of services) {
    const cat = s.category ?? "Other";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(s);
  }
  return map;
}

export function StepServiceSelect({ services }: StepServiceSelectProps) {
  const { selectedService, selectService, nextStep } = useBookingStore();
  const grouped = groupByCategory(services);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2 text-primary mb-2">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wider">Step 1 of 4</span>
        </div>
        <h2 className="text-2xl font-bold">Choose Your Service</h2>
        <p className="text-muted-foreground">Select the service you&apos;d like to book</p>
      </div>

      <div className="space-y-6">
        {Array.from(grouped.entries()).map(([category, categoryServices]) => (
          <div key={category}>
            {grouped.size > 1 && (
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">
                {category}
              </h3>
            )}
            <div className="grid gap-3">
              {categoryServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  selected={selectedService?.id === service.id}
                  onSelect={selectService}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={nextStep}
        disabled={!selectedService}
        className="w-full h-12 text-base"
        size="lg"
      >
        Continue
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}
