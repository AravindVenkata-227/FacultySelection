
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'; // Import ScrollBar
import { LogOut, Users, AlertTriangle, Loader2, Download, FileSpreadsheet } from 'lucide-react';
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
        if (data && Array.isArray(data) && data.length > 0) {
          setHeaders(Object.keys(data[0]));
          setSubmissions(data);
        } else if (Array.isArray(data) && data.length === 0) {
          setSubmissions([]);
          setHeaders([]);
        } else if (data === null || !Array.isArray(data)) { 
          setSubmissions([]);
          setHeaders([]);
          if (data === null) {
             setError('Failed to retrieve data from source. Service might be unavailable.');
             toast({ title: 'Error', description: 'Failed to retrieve data from source. Service might be unavailable.', variant: 'destructive'});
          } else {
             setError('Received unexpected data format for submissions.');
             toast({ title: 'Error', description: 'Received unexpected data format for submissions.', variant: 'destructive'});
          }
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

  const escapeCSVField = (field: string | null | undefined): string => {
    if (field === null || field === undefined) {
      return '';
    }
    let stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      stringField = stringField.replace(/"/g, '""'); 
      return `"${stringField}"`; 
    }
    return stringField;
  };

  const handleDownload = () => {
    if (submissions.length === 0 || headers.length === 0) {
      toast({
        title: 'No Data',
        description: 'There is no data to download.',
        variant: 'default',
      });
      return;
    }

    const csvContent = [
      headers.map(escapeCSVField).join(','), 
      ...submissions.map(submission =>
        headers.map(header => escapeCSVField(submission[header])).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'faculty_submissions.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: 'Download Started',
        description: 'The submissions CSV file is being downloaded.',
      });
    } else {
       toast({
        title: 'Download Failed',
        description: 'Your browser does not support direct file downloads.',
        variant: 'destructive',
      });
    }
  };


  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-auto items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4 flex-wrap">
        <div className="flex items-center">
          <FileSpreadsheet className="mr-2 h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold text-primary">
            Admin Dashboard
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={handleDownload} variant="outline" size="sm" disabled={isLoading || submissions.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Download CSV
          </Button>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Candidate Submissions</CardTitle>
                <CardDescription>List of all candidates who have submitted the faculty selection form.</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Submissions</p>
                <p className="text-2xl font-bold text-primary">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : submissions.length}</p>
              </div>
            </div>
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
              <ScrollArea className="max-h-[calc(100vh-22rem)] w-full"> {/* Removed overflow-auto */}
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
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
                <ScrollBar orientation="horizontal" /> {/* Added horizontal scrollbar */}
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
