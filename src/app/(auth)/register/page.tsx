'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Loader2, ShieldCheck, Zap, MessagesSquare, ArrowRight, CheckCircle2 } from 'lucide-react';
import { VerseBrand } from '@/components/brand/verse-logo';

import { useAuthStore } from '@/store/use-auth-store';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: z.string().email('Please enter a valid email address'),
  newTenantName: z.string().min(2, 'Organization name must be at least 2 characters').max(255).optional().or(z.literal('')),
  message: z.string().max(1000).optional().or(z.literal('')),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const requestAccess = useAuthStore((state) => state.requestAccess);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.setError);
  const storeError = useAuthStore((state) => state.error);
  const setError = useAuthStore((state) => state.setError);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', newTenantName: '', message: '' },
  });

  async function onSubmit(values: RegisterFormValues) {
    try {
      setError(null);
      const msg = await requestAccess({
        name: values.name,
        email: values.email,
        newTenantName: values.newTenantName || undefined,
        message: values.message || undefined,
      });
      setSuccessMessage(msg);
    } catch {
      // error already set in store
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[54%] relative overflow-hidden">
        <img
          src="/knowledge-hero.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-[#030712]" />
        <div className="absolute top-0 bottom-0 right-0 w-[30%] bg-gradient-to-r from-transparent to-[#030712]" />

        <div className="relative z-10 flex flex-col justify-between w-full h-full p-10 lg:p-12">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <VerseBrand textClassName="text-white" />
          </Link>

          <div className="space-y-5 max-w-[480px]">
            <h1 className="text-[2.8rem] font-bold leading-[1.1] tracking-tight text-white drop-shadow-lg">
              Get your team on Verse AI
            </h1>
            <p className="text-[15px] text-white/70 leading-relaxed max-w-[400px]">
              Request access and we&apos;ll set up a private knowledge base for your organization — isolated, secure, and ready in minutes.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex flex-wrap gap-2.5">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.08] backdrop-blur-sm border border-white/[0.1] text-[13px] text-white/80">
                <Zap className="h-3.5 w-3.5 text-cyan-400" />
                Instant answers
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.08] backdrop-blur-sm border border-white/[0.1] text-[13px] text-white/80">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                Tenant isolation
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.08] backdrop-blur-sm border border-white/[0.1] text-[13px] text-white/80">
                <MessagesSquare className="h-3.5 w-3.5 text-cyan-400" />
                Conversational AI
              </div>
            </div>

            <div className="bg-white/[0.06] backdrop-blur-md rounded-2xl border border-white/[0.08] p-5">
              <p className="text-[13px] text-white/70 leading-relaxed italic">
                &ldquo;Verse AI cut our document lookup time by 80%. Our team gets cited answers instead of digging through folders.&rdquo;
              </p>
              <div className="flex items-center gap-3 mt-3.5">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-400/40 to-teal-400/40 flex items-center justify-center text-[10px] font-semibold text-white">
                  RC
                </div>
                <div>
                  <p className="text-[12px] font-medium text-white/80">Rafael Costa</p>
                  <p className="text-[11px] text-white/40">Head of Legal, NovaBridge LLP</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col bg-gray-950 text-white min-h-screen relative overflow-hidden">
        <div className="absolute top-[10%] right-[-5%] w-[300px] h-[300px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)' }}
        />
        <div className="absolute bottom-[15%] left-[-8%] w-[250px] h-[250px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)' }}
        />

        <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 relative z-10">
          <div className="w-full max-w-[400px]">
            <Link href="/" className="lg:hidden mb-6 inline-block hover:opacity-80 transition-opacity">
              <VerseBrand textClassName="text-white" />
            </Link>

            {successMessage ? (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-7 sm:p-8 space-y-4 backdrop-blur-sm text-center">
                <div className="flex justify-center">
                  <CheckCircle2 className="h-12 w-12 text-cyan-400" />
                </div>
                <h2 className="text-xl font-semibold text-white tracking-tight">Request submitted!</h2>
                <p className="text-[13px] text-gray-400 leading-relaxed">{successMessage}</p>
                <p className="text-[13px] text-gray-500">
                  We&apos;ll review your request and reach out to the email you provided.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 mt-2 text-[13px] text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Already have access? Sign in
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-7 sm:p-8 space-y-6 backdrop-blur-sm">
                <div>
                  <h2 className="text-xl font-semibold text-white tracking-tight">Get started</h2>
                  <p className="text-[13px] text-gray-500 mt-1.5">
                    Request access for your organization. We&apos;ll set everything up for you.
                  </p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400 text-[13px] font-normal">Full name</FormLabel>
                          <FormControl>
                            <Input
                              className="h-11 bg-white/[0.04] border-white/[0.08] rounded-[10px] text-white placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-cyan-400/40 focus-visible:border-cyan-400/30 transition-all text-[14px]"
                              placeholder="Jane Smith"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400 text-[13px] font-normal">Work email</FormLabel>
                          <FormControl>
                            <Input
                              className="h-11 bg-white/[0.04] border-white/[0.08] rounded-[10px] text-white placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-cyan-400/40 focus-visible:border-cyan-400/30 transition-all text-[14px]"
                              placeholder="jane@company.com"
                              type="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="newTenantName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400 text-[13px] font-normal">
                            Organization name <span className="text-gray-600">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="h-11 bg-white/[0.04] border-white/[0.08] rounded-[10px] text-white placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-cyan-400/40 focus-visible:border-cyan-400/30 transition-all text-[14px]"
                              placeholder="Acme Corp"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400 text-[13px] font-normal">
                            Tell us about your use case <span className="text-gray-600">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              className="bg-white/[0.04] border-white/[0.08] rounded-[10px] text-white placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-cyan-400/40 focus-visible:border-cyan-400/30 transition-all text-[14px] resize-none min-h-[80px]"
                              placeholder="We want to use Verse AI for..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {storeError && (
                      <div className="text-[13px] text-red-400 bg-red-950/30 px-4 py-2.5 rounded-[10px] border border-red-900/30">
                        {storeError}
                      </div>
                    )}

                    <Button
                      className="w-full h-11 bg-cyan-400 hover:bg-cyan-300 text-gray-950 font-semibold rounded-[10px] transition-all shadow-lg shadow-cyan-400/15 hover:shadow-cyan-400/25 cursor-pointer text-[14px] group"
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Request access
                      {!isLoading && <ArrowRight className="ml-2 h-4 w-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />}
                    </Button>
                  </form>
                </Form>

                <p className="text-center text-[13px] text-gray-600">
                  Already have an account?{' '}
                  <Link href="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>
            )}

            <div className="mt-8 text-center">
              <p className="text-[11px] text-gray-700">
                © {new Date().getFullYear()} Verse AI. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
