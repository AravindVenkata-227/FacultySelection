
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LogOut, Users, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Submission {
  [key: string]: string;
}

export default function AdminDashboardPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/admin/submissions');
        if (!response.ok) {
          if (response.status === 401) {
            toast({ title: 'Unauthorized', description: 'Redirecting to login.', variant: 'destructive'});
            router.push('/admin/login');
            return;
          }
          throw new Error(`Failed to fetch submissions: ${response.statusText}`);
        }
        const data = await response.json();
        if (data && data.length > 0) {
          setHeaders(Object.keys(data[0]));
          setSubmissions(data);
        } else {
          setSubmissions([]);
          setHeaders([]);
        }
      } catch (err: any) {
        console.error('Error fetching submissions:', err);
        setError(err.message || 'Could not fetch submissions.');
        toast({ title: 'Error', description: err.message || 'Could not fetch submissions.', variant: 'destructive'});
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [router, toast]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/admin/login');
      router.refresh(); 
    } catch (err) {
      console.error('Logout failed:', err);
      toast({ title: 'Logout Failed', description: 'Could not log out. Please try again.', variant: 'destructive'});
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
        <h1 className="text-xl font-semibold text-primary flex items-center">
          <Users className="mr-2 h-6 w-6" /> Admin Dashboard - Candidate Submissions
        </h1>
        <Button onClick={handleLogout} variant="outline" size="sm" className="ml-auto">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Submitted Forms</CardTitle>
            <CardDescription>List of all candidates who have submitted the faculty selection form.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading submissions...</p>
              </div>
            ) : error ? (
              <div className="text-destructive flex flex-col items-center py-10">
                <AlertTriangle className="h-10 w-10 mb-2" />
                <p className="text-lg font-semibold">Error loading data</p>
                <p>{error}</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-10">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No submissions found yet.</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[calc(100vh-20rem)] w-full overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                    <TableRow>
                      {headers.map((header) => (
                        <TableHead key={header} className="font-semibold whitespace-nowrap">{header.replace(/([A-Z])/g, ' $1').trim()}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission, index) => (
                      <TableRow key={index}>
                        {headers.map((header) => (
                          <TableCell key={header} className="whitespace-nowrap">{submission[header]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
       <footer className="text-center p-4 text-xs text-muted-foreground">
          Faculty Connect Admin Panel
        </footer>
    </div>
  );
}
