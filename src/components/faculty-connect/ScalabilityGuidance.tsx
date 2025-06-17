'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Lightbulb, Loader2 } from 'lucide-react';
import { getAIScalingGuidance } from '@/lib/actions';
import type { ScalingGuidanceOutput } from '@/ai/flows/scaling-guidance';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ScalabilityGuidance() {
  const [isOpen, setIsOpen] = useState(false);
  const [guidance, setGuidance] = useState<ScalingGuidanceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGuidance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAIScalingGuidance();
      setGuidance(result);
    } catch (err) {
      setError('Failed to fetch scaling guidance. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !guidance && !isLoading) {
      fetchGuidance();
    }
  }, [isOpen, guidance, isLoading]);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 shadow-lg hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
        aria-label="Get Scaling Guidance"
      >
        <Lightbulb className="mr-2 h-5 w-5" />
        Scaling Guidance
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] md:max-w-[750px] lg:max-w-[900px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline text-primary flex items-center">
              <Lightbulb className="mr-2 h-7 w-7" />
              AI-Powered Scaling Guidance
            </DialogTitle>
            <DialogDescription>
              Recommendations for scaling the Faculty Connect application to handle high concurrency.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-grow pr-2">
            <div className="py-4 space-y-4">
              {isLoading && (
                <div className="flex items-center justify-center space-x-2 text-primary">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span>Fetching recommendations...</span>
                </div>
              )}
              {error && (
                <Alert variant="destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {guidance && guidance.recommendations && (
                <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none p-4 bg-secondary/30 rounded-md shadow">
                  <pre className="whitespace-pre-wrap break-words font-body text-sm leading-relaxed text-foreground">
                    {guidance.recommendations}
                  </pre>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-auto pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
