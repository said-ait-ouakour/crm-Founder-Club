"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Send,
  User,
  Check,
  MessageSquareText,
  Plus,
  Bold,
  Italic,
  List,
  ListOrdered,
  FileIcon,
  ImageIcon,
  FileText,
  File,
  Download,
  Video,
  Headphones,
  XCircle
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

// Templates and constants
const EMAIL_TEMPLATES: any[] = [
  {
    id: "peoplemanager-intro",
    name: "PeopleManager Introduction",
    subject: "Turn your top performer's habits into a system that trains everyone.",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PeopleManager - Transform Your Team Performance</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
        <tr>
            <td style="padding: 50px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.12); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 50px 50px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); position: relative;">
                            <img src="https://peoplemanager.co/logo-full.png" alt="PeopleManager Logo" width="100" height="100" style="display: block; margin: 0 auto 20px; border-radius: 50%; border: 4px solid rgba(255,255,255,0.3); box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
                            <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">PeopleManager.co</h1>
                            <p style="margin: 12px 0 0; font-size: 14px; color: #ffffff; font-weight: 500; letter-spacing: 2px; opacity: 0.95; text-transform: uppercase;">Train · Track · Transform</p>
                        </td>
                    </tr>
                    
                    <!-- Decorative Bar -->
                    <tr>
                        <td style="padding: 0; height: 6px; background: linear-gradient(90deg, #f093fb 0%, #f5576c 20%, #4facfe 40%, #00f2fe 60%, #43e97b 80%, #ffd700 100%);"></td>
                    </tr>
                    
                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 50px 50px 40px; background-color: #ffffff;">
                            <p style="margin: 0 0 24px; font-size: 17px; line-height: 1.6; color: #334155;">Hi <strong style="color: #667eea;">{{FirstName}}</strong>,</p>
                            
                            <div style="margin: 0 0 32px; padding: 28px; background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-radius: 12px; border-left: 5px solid #667eea;">
                                <p style="margin: 0; font-size: 20px; line-height: 1.5; color: #1e293b; font-weight: 600; font-style: italic;">Imagine if every person on your team performed like your best one.</p>
                            </div>
                            
                            <p style="margin: 0 0 28px; font-size: 17px; line-height: 1.8; color: #334155;">That's exactly what <strong>PeopleManager</strong> does — it trains, tracks, and transforms staff performance using a repeatable framework that builds mastery across communication, sales, and service.</p>
                            
                            <p style="margin: 0 0 20px; font-size: 17px; line-height: 1.6; color: #1e293b; font-weight: 600;">Here's what our clients see in the first 90 days:</p>
                            
                            <!-- Stats Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 32px; background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                                <tr>
                                    <td style="padding: 32px 32px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 0 0 24px; border-bottom: 1px solid #e2e8f0;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                        <tr>
                                                            <td width="80" valign="middle">
                                                                <div style="width: 70px; height: 70px; border-radius: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center;">
                                                                    <span style="font-size: 32px; font-weight: 800; color: #ffffff; line-height: 70px; text-align: center; display: block;">37%</span>
                                                                </div>
                                                            </td>
                                                            <td valign="middle">
                                                                <p style="margin: 0; font-size: 17px; color: #1e293b; font-weight: 600; line-height: 1.4;">Faster onboarding for new hires</p>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 24px 0; border-bottom: 1px solid #e2e8f0;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                        <tr>
                                                            <td width="80" valign="middle">
                                                                <div style="width: 70px; height: 70px; border-radius: 12px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); display: flex; align-items: center; justify-content: center;">
                                                                    <span style="font-size: 32px; font-weight: 800; color: #ffffff; line-height: 70px; text-align: center; display: block;">52%</span>
                                                                </div>
                                                            </td>
                                                            <td valign="middle">
                                                                <p style="margin: 0; font-size: 17px; color: #1e293b; font-weight: 600; line-height: 1.4;">Higher conversion consistency</p>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 24px 0 0;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                        <tr>
                                                            <td width="80" valign="middle">
                                                                <div style="width: 70px; height: 70px; border-radius: 12px; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); display: flex; align-items: center; justify-content: center;">
                                                                    <span style="font-size: 28px; font-weight: 800; color: #ffffff; line-height: 70px; text-align: center; display: block;">100%</span>
                                                                </div>
                                                            </td>
                                                            <td valign="middle">
                                                                <p style="margin: 0; font-size: 17px; color: #1e293b; font-weight: 600; line-height: 1.4;">Visibility on who's applying training — and who isn't</p>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 28px; font-size: 17px; line-height: 1.8; color: #334155;">The system blends live call analysis, real-time coaching, and AI role-play to embed skills that stick — without managers chasing or guessing.</p>
                            
                            <p style="margin: 0 0 40px; font-size: 17px; line-height: 1.8; color: #334155;">If you're scaling, retraining, or simply tired of uneven performance, let's show you how teams are using PeopleManager to make excellence automatic.</p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 40px; width: 100%;">
                                <tr>
                                    <td align="center">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="border-radius: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); box-shadow: 0 8px 24px rgba(102, 126, 234, 0.35);">
                                                    <a href="https://peoplemanager.co/contact" style="display: inline-block; padding: 20px 48px; font-size: 17px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; letter-spacing: 0.3px;">📅 Schedule My 15-Minute Demo</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Signature -->
                    <tr>
                        <td style="padding: 0 50px 50px; background-color: #ffffff;">
                            <div style="border-top: 2px solid #e2e8f0; padding-top: 32px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td width="70" valign="top" style="padding-right: 20px;">
                                            <div style="width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                                                <span style="color: #ffffff; font-size: 28px; font-weight: 700; line-height: 70px; text-align: center; display: block;">TM</span>
                                            </div>
                                        </td>
                                        <td valign="middle">
                                            <p style="margin: 0 0 6px; font-size: 19px; font-weight: 700; color: #1e293b; letter-spacing: -0.3px;">Terry Murphy</p>
                                            <p style="margin: 0 0 4px; font-size: 15px; color: #64748b; font-weight: 500;">Founder, PeopleManager</p>
                                            <p style="margin: 8px 0 0; font-size: 14px; color: #94a3b8;">🌐 <a href="https://peoplemanager.co" style="color: #667eea; text-decoration: none; font-weight: 600;">peoplemanager.co</a></p>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 50px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-top: 2px solid #e2e8f0;">
                            <p style="margin: 0; font-size: 13px; line-height: 1.8; color: #64748b; text-align: center;">
                                © 2025 PeopleManager. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
  },
  {
    id: "employment-placement-agencies",
    name: "Activities of employment placement agencies",
    subject: "Transform Your Recruitment Training",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>PeopleManager - Transform Your Recruitment Training</title>
    <style>
        /* Force light mode colors with dark mode overrides */
        [data-ogsc] .stats-container,
        [data-ogsb] .stats-container {
            background-color: #1e293b !important;
        }
        
        /* Dark mode overrides */
        @media (prefers-color-scheme: dark) {
            /* Backgrounds */
            .email-body { background-color: #0f172a !important; }
            .content-card { background-color: #1e293b !important; }
            .highlight-box { background-color: rgba(102, 126, 234, 0.15) !important; }
            .stats-container { background-color: #0f172a !important; }
            .footer-bg { background-color: #1e293b !important; }
            
            /* Text colors */
            .primary-text { color: #f1f5f9 !important; }
            .secondary-text { color: #cbd5e1 !important; }
            .muted-text { color: #94a3b8 !important; }
            
            /* Borders */
            .border-color { border-color: #475569 !important; }
            
            /* Force stats container to be dark */
            .stats-box { background-color: #0f172a !important; }
        }
        
        /* Outlook specific */
        @media screen and (max-width: 600px) {
            .stats-container {
                background-color: transparent !important;
            }
        }
    </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
    
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
        <tr>
            <td style="padding: 50px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="content-card" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.12); overflow: hidden; max-width: 100%;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 50px 40px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            <h1 style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                                Build it once. Every new hire learns it, proves it, and performs it.
                            </h1>
                            <p style="margin: 12px 0 0; font-size: 14px; color: #ffffff; font-weight: 500; letter-spacing: 2px; opacity: 0.95;">TRAIN · TRACK · TRANSFORM</p>
                        </td>
                    </tr>
                    
                    <!-- Rainbow Bar -->
                    <tr>
                        <td style="padding: 0; height: 6px; background: linear-gradient(90deg, #f093fb 0%, #f5576c 20%, #4facfe 40%, #00f2fe 60%, #43e97b 80%, #ffd700 100%);"></td>
                    </tr>
                    
                    <!-- Body Content -->
                    <tr>
                        <td class="content-card" style="padding: 40px 40px 30px; background-color: #ffffff;">
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Hi {{FirstName}} {{LastName}},
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Every recruitment firm has one consultant who just gets it.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                They qualify better, close faster, and turn clients into long-term accounts.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Now imagine if every recruiter performed at that level — without you or your managers repeating the same training again and again.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                <strong>PeopleManager</strong> turns your exact recruitment process into a plug-and-play training system.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                New consultants sit down, learn it, prove it, and perform it — the way you want it done.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #334155;">
                                We train it so you don't have to:
                            </p>
                            
                            <strong>
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Candidate sourcing & qualification (ideal fit, red-flag spotting)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Client development & relationship building
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Interview preparation & follow-up discipline
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Objection handling & closing techniques
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • CRM note-taking & compliance (GDPR, KYC)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Offer management & counter-offer control
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Pipeline management & daily activity structure
                            </p>
                            </strong>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Managers see live progress, skill scores, and proof of who's following process — and who's not.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Result: <strong>more placements, cleaner pipelines, and consistency that scales.</strong>
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 40px; font-size: 16px; line-height: 1.6; color: #334155;">
                                If you'd like to explore how this could work for <strong>{{BusinessName}}</strong>, <strong>REPLY</strong> and we'll arrange a quick strategy call with one of our recruitment-sector experts.
                            </p>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer-bg" style="padding: 40px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                            <img src="https://peoplemanager.co/logo-full.png" alt="PeopleManager Logo" width="70" height="70" style="display: block; margin: 0 auto 20px; border-radius: 50%; border: 3px solid rgba(102, 126, 234, 0.3); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                            <p class="primary-text" style="margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #1e293b;">
                                Terence Murphy
                            </p>
                            <p class="secondary-text" style="margin: 0 0 16px; font-size: 14px; color: #64748b;">
                                CEO, PeopleManager.co
                            </p>
                            <p class="muted-text" style="margin: 0 0 4px; font-size: 13px; color: #94a3b8;">
                                📞 +44 (0)20 8044 5235
                            </p>
                            <p class="muted-text" style="margin: 0 0 4px; font-size: 13px; color: #94a3b8;">
                                🌐 <a href="https://peoplemanager.co" style="color: #667eea !important; text-decoration: none; font-weight: 600;">peoplemanager.co</a>
                            </p>
                            <p class="muted-text" style="margin: 0 0 20px; font-size: 13px; color: #94a3b8;">
                                📍 Vune1292, Compass Building, Al Hulaila Industrial Zone-FZ, UAE
                            </p>
                            <p class="muted-text" style="margin: 0 0 20px; font-size: 11px; line-height: 1.6; color: #94a3b8; font-style: italic; max-width: 500px; margin-left: auto; margin-right: auto;">
                                <strong>Confidentiality Notice:</strong> This email and any attachments are intended solely for the recipient and may contain confidential or legally privileged information. If you are not the intended recipient, please notify the sender immediately and delete this message.
                            </p>
                            <p class="secondary-text" style="margin: 0; font-size: 13px; color: #64748b;">
                                ©️ PeopleManager FZ-LLC · All rights reserved
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
  },
  {
    id: "medical-nursing-home",
    name: "Medical nursing home activities",
    subject: "Transform Your Care Home Training",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>PeopleManager - Transform Your Care Home Training</title>
    <style>
        /* Force light mode colors with dark mode overrides */
        [data-ogsc] .stats-container,
        [data-ogsb] .stats-container {
            background-color: #1e293b !important;
        }
        
        /* Dark mode overrides */
        @media (prefers-color-scheme: dark) {
            /* Backgrounds */
            .email-body { background-color: #0f172a !important; }
            .content-card { background-color: #1e293b !important; }
            .highlight-box { background-color: rgba(102, 126, 234, 0.15) !important; }
            .stats-container { background-color: #0f172a !important; }
            .footer-bg { background-color: #1e293b !important; }
            
            /* Text colors */
            .primary-text { color: #f1f5f9 !important; }
            .secondary-text { color: #cbd5e1 !important; }
            .muted-text { color: #94a3b8 !important; }
            
            /* Borders */
            .border-color { border-color: #475569 !important; }
            
            /* Force stats container to be dark */
            .stats-box { background-color: #0f172a !important; }
        }
        
        /* Outlook specific */
        @media screen and (max-width: 600px) {
            .stats-container {
                background-color: transparent !important;
            }
        }
    </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
    
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
        <tr>
            <td style="padding: 50px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="content-card" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.12); overflow: hidden; max-width: 100%;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 50px 40px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            <h1 style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                                Build it once. Every new hire learns it, proves it, and performs it.
                            </h1>
                            <p style="margin: 12px 0 0; font-size: 14px; color: #ffffff; font-weight: 500; letter-spacing: 2px; opacity: 0.95;">TRAIN · TRACK · TRANSFORM</p>
                        </td>
                    </tr>
                    
                    <!-- Rainbow Bar -->
                    <tr>
                        <td style="padding: 0; height: 6px; background: linear-gradient(90deg, #f093fb 0%, #f5576c 20%, #4facfe 40%, #00f2fe 60%, #43e97b 80%, #ffd700 100%);"></td>
                    </tr>
                    
                    <!-- Body Content -->
                    <tr>
                        <td class="content-card" style="padding: 40px 40px 30px; background-color: #ffffff;">
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Hi {{FirstName}} {{LastName}},
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Every care home has one carer who just gets it.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                They follow every procedure, treat residents with dignity, and handle families with care.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Now imagine if every new hire did the same — without you or your senior staff repeating training, week after week.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                <strong>PeopleManager</strong> turns your best standards of care into a permanent training system.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                New carers sit down, learn it, prove it, and deliver care your way — every shift.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #334155;">
                                We train it so you don't have to:
                            </p>
                            
                            <strong>
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Resident care protocols (washing, dressing, feeding, positioning)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Medication administration & record keeping (MAR sheet accuracy, double-checks)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Safeguarding & infection control procedures
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Communication & empathy skills (with residents and families)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Incident reporting & escalation
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Confidentiality, GDPR & dignity standards
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • End-of-life care & emotional support basics
                            </p>
                            </strong>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Managers see live progress, completion scores, and compliance proof on every member of staff.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Result: <strong>safer care, fewer complaints, lower turnover, and complete CQC confidence.</strong>
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 40px; font-size: 16px; line-height: 1.6; color: #334155;">
                                If you'd like to see how this could work for <strong>{{BusinessName}}</strong>, <strong>REPLY</strong> and we'll arrange a quick strategy call with one of our healthcare specialists.
                            </p>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer-bg" style="padding: 40px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                            <img src="https://peoplemanager.co/logo-full.png" alt="PeopleManager Logo" width="70" height="70" style="display: block; margin: 0 auto 20px; border-radius: 50%; border: 3px solid rgba(102, 126, 234, 0.3); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                            <p class="primary-text" style="margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #1e293b;">
                                Terence Murphy
                            </p>
                            <p class="secondary-text" style="margin: 0 0 16px; font-size: 14px; color: #64748b;">
                                CEO, PeopleManager.co
                            </p>
                            <p class="muted-text" style="margin: 0 0 4px; font-size: 13px; color: #94a3b8;">
                                📞 +44 (0)20 8044 5235
                            </p>
                            <p class="muted-text" style="margin: 0 0 4px; font-size: 13px; color: #94a3b8;">
                                🌐 <a href="https://peoplemanager.co" style="color: #667eea !important; text-decoration: none; font-weight: 600;">peoplemanager.co</a>
                            </p>
                            <p class="muted-text" style="margin: 0 0 20px; font-size: 13px; color: #94a3b8;">
                                📍 Vune1292, Compass Building, Al Hulaila Industrial Zone-FZ, UAE
                            </p>
                            <p class="muted-text" style="margin: 0 0 20px; font-size: 11px; line-height: 1.6; color: #94a3b8; font-style: italic; max-width: 500px; margin-left: auto; margin-right: auto;">
                                <strong>Confidentiality Notice:</strong> This email and any attachments are intended solely for the recipient and may contain confidential or legally privileged information. If you are not the intended recipient, please notify the sender immediately and delete this message.
                            </p>
                            <p class="secondary-text" style="margin: 0; font-size: 13px; color: #64748b;">
                                ©️ PeopleManager FZ-LLC · All rights reserved
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
  },
  {
    id: "other-amusement-recreation",
    name: "Other amusement and recreation activities n.e.c.",
    subject: "Build Consistent Guest Experiences",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>PeopleManager - Build Consistent Guest Experiences</title>
  <style>
    [data-ogsc] .stats-container,
    [data-ogsb] .stats-container {
      background-color: #1e293b !important;
    }

    @media (prefers-color-scheme: dark) {
      .email-body { background-color: #0f172a !important; }
      .content-card { background-color: #1e293b !important; }
      .highlight-box { background-color: rgba(102, 126, 234, 0.15) !important; }
      .stats-container { background-color: #0f172a !important; }
      .footer-bg { background-color: #1e293b !important; }

      .primary-text { color: #f1f5f9 !important; }
      .secondary-text { color: #cbd5e1 !important; }
      .muted-text { color: #94a3b8 !important; }

      .border-color { border-color: #475569 !important; }

      .stats-box { background-color: #0f172a !important; }
    }

    @media screen and (max-width: 600px) {
      .stats-container {
        background-color: transparent !important;
      }
    }
  </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
    <tr>
      <td style="padding: 50px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="content-card" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.12); overflow: hidden; max-width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding: 50px 40px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <h1 style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                Build it once. Every staff member learns it, proves it, and performs it.
              </h1>
              <p style="margin: 12px 0 0; font-size: 14px; color: #ffffff; font-weight: 500; letter-spacing: 2px; opacity: 0.95;">TRAIN · TRACK · TRANSFORM</p>
            </td>
          </tr>

          <!-- Rainbow Bar -->
          <tr>
            <td style="padding: 0; height: 6px; background: linear-gradient(90deg, #f093fb 0%, #f5576c 20%, #4facfe 40%, #00f2fe 60%, #43e97b 80%, #ffd700 100%);"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="content-card" style="padding: 40px 40px 30px; background-color: #ffffff;">

              <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                Hi {{FirstName}},
              </p>

              <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                Every leisure business has a few staff who just get it.
              </p>

              <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                They greet guests right, handle issues fast, and make every visitor feel valued.
              </p>

              <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                Now imagine if every team member did that — without you or your managers constantly retraining.
              </p>

              <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                <strong>PeopleManager</strong> turns your exact service process into a plug-and-play training system.
              </p>

              <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                New hires sit down, learn it, prove it, and deliver a consistent experience every shift.
              </p>

              <p class="primary-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #334155;">
                We train it so you don't have to:
              </p>

              <strong>
                <p class="primary-text" style="margin: 0 0 8px; padding-left: 20px;">• Front-of-house & reception flow (greeting, check-in, issue resolution)</p>
                <p class="primary-text" style="margin: 0 0 8px; padding-left: 20px;">• Health & safety procedures (equipment use, incident reporting, first-aid awareness)</p>
                <p class="primary-text" style="margin: 0 0 8px; padding-left: 20px;">• Sales & membership upselling (scripts that feel natural, not pushy)</p>
                <p class="primary-text" style="margin: 0 0 8px; padding-left: 20px;">• Customer service & complaint handling</p>
                <p class="primary-text" style="margin: 0 0 8px; padding-left: 20px;">• Facility cleanliness & opening/closing standards</p>
                <p class="primary-text" style="margin: 0 0 8px; padding-left: 20px;">• Event prep & guest coordination</p>
                <p class="primary-text" style="margin: 0 0 20px; padding-left: 20px;">• Cross-team communication (so service feels seamless)</p>
              </strong>

              <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                Managers see live progress, training results, and where standards slip — before customers notice.
              </p>

              <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                Result: <strong>consistent experiences, faster onboarding, and less turnover caused by unclear expectations.</strong>
              </p>

              <p class="primary-text" style="margin: 0 0 40px; font-size: 16px; line-height: 1.6; color: #334155;">
                If you'd like to explore how this could work for <strong>{{BusinessName}}</strong>, <strong>REPLY</strong> and we'll arrange a quick strategy call with one of our leisure-sector specialists.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer-bg" style="padding: 40px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <img src="https://peoplemanager.co/logo-full.png" alt="PeopleManager Logo" width="70" height="70" style="display: block; margin: 0 auto 20px; border-radius: 50%; border: 3px solid rgba(102, 126, 234, 0.3); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
              <p class="primary-text" style="margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #1e293b;">Terence Murphy</p>
              <p class="secondary-text" style="margin: 0 0 16px; font-size: 14px; color: #64748b;">CEO, PeopleManager.co</p>
              <p class="muted-text" style="margin: 0 0 4px; font-size: 13px;">📞 +44 (0)20 8044 5235</p>
              <p class="muted-text" style="margin: 0 0 4px; font-size: 13px;">🌐 <a href="https://peoplemanager.co" style="color: #667eea !important; text-decoration: none; font-weight: 600;">peoplemanager.co</a></p>
              <p class="muted-text" style="margin: 0 0 20px; font-size: 13px;">📍 Vune1292, Compass Building, Al Hulaila Industrial Zone-FZ, UAE</p>
              <p class="muted-text" style="margin: 0 0 20px; font-size: 11px; line-height: 1.6; font-style: italic; max-width: 500px; margin-left: auto; margin-right: auto;">
                <strong>Confidentiality Notice:</strong> This email and any attachments are intended solely for the recipient and may contain confidential or legally privileged information. If you are not the intended recipient, please notify the sender immediately and delete this message.
              </p>
              <p class="secondary-text" style="margin: 0; font-size: 13px; color: #64748b;">©️ PeopleManager FZ-LLC · All rights reserved</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  {
    id: "human-resources-provision",
    name: "Human resources provision and management of human resources functions",
    subject: "Transform Your HR Training & Compliance",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>PeopleManager - Transform Your HR Training & Compliance</title>
  <style>
    [data-ogsc] .stats-container,
    [data-ogsb] .stats-container {
      background-color: #1e293b !important;
    }

    @media (prefers-color-scheme: dark) {
      .email-body { background-color: #0f172a !important; }
      .content-card { background-color: #1e293b !important; }
      .highlight-box { background-color: rgba(102, 126, 234, 0.15) !important; }
      .stats-container { background-color: #0f172a !important; }
      .footer-bg { background-color: #1e293b !important; }

      .primary-text { color: #f1f5f9 !important; }
      .secondary-text { color: #cbd5e1 !important; }
      .muted-text { color: #94a3b8 !important; }

      .border-color { border-color: #475569 !important; }

      .stats-box { background-color: #0f172a !important; }
    }

    @media screen and (max-width: 600px) {
      .stats-container {
        background-color: transparent !important;
      }
    }
  </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
    <tr>
      <td style="padding: 50px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="content-card" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.12); overflow: hidden; max-width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding: 50px 40px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <h1 style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                Build it once. Every team member learns it, proves it, and performs it.
              </h1>
              <p style="margin: 12px 0 0; font-size: 14px; color: #ffffff; font-weight: 500; letter-spacing: 2px; opacity: 0.95;">TRAIN · TRACK · TRANSFORM</p>
            </td>
          </tr>

          <!-- Rainbow Bar -->
          <tr>
            <td style="padding: 0; height: 6px; background: linear-gradient(90deg, #f093fb 0%, #f5576c 20%, #4facfe 40%, #00f2fe 60%, #43e97b 80%, #ffd700 100%);"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="content-card" style="padding: 40px 40px 30px; background-color: #ffffff;">

              <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                Hi {{FirstName}},
              </p>

              <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                Every HR firm has that one consultant who just gets it.
              </p>

              <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                They handle clients the right way, manage documentation properly, and always stay compliant.
              </p>

              <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                Now imagine if every consultant worked like that — without you or your senior team repeating the same training every time someone joins.
              </p>

              <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                <strong>PeopleManager</strong> turns your best HR process into a plug-and-play training system.
              </p>

              <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                New hires sit down, learn it, prove it, and deliver your standards from day one.
              </p>

              <p class="primary-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #334155;">
                We train it so you don't have to:
              </p>

              <strong>
                <p class="primary-text" style="margin: 0 0 8px; padding-left: 20px;">• Client onboarding & documentation handling</p>
                <p class="primary-text" style="margin: 0 0 8px; padding-left: 20px;">• Employment law updates & compliance essentials</p>
                <p class="primary-text" style="margin: 0 0 8px; padding-left: 20px;">• Disciplinary & grievance procedures</p>
                <p class="primary-text" style="margin: 0 0 8px; padding-left: 20px;">• HR software workflows & reporting formats</p>
                <p class="primary-text" style="margin: 0 0 8px; padding-left: 20px;">• IAM communication & tone consistency</p>
                <p class="primary-text" style="margin: 0 0 8px; padding-left: 20px;">• Confidentiality & GDPR requirements</p>
                <p class="primary-text" style="margin: 0 0 20px; padding-left: 20px;">• Internal workflow and escalation steps</p>
              </strong>

              <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                Managers see real-time training completion, proof of compliance, and early signs of drift before it becomes a client issue.
              </p>

              <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                Result: <strong>tighter consistency, lower risk, and consultants who represent your brand perfectly.</strong>
              </p>

              <p class="primary-text" style="margin: 0 0 40px; font-size: 16px; line-height: 1.6; color: #334155;">
                If you'd like to explore how this could work for <strong>{{BusinessName}}</strong>, <strong>REPLY</strong> and we'll organise a quick strategy call with one of our HR-sector specialists.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer-bg" style="padding: 40px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <img src="https://peoplemanager.co/logo-full.png" alt="PeopleManager Logo" width="70" height="70" style="display: block; margin: 0 auto 20px; border-radius: 50%; border: 3px solid rgba(102, 126, 234, 0.3); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
              <p class="primary-text" style="margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #1e293b;">Terence Murphy</p>
              <p class="secondary-text" style="margin: 0 0 16px; font-size: 14px; color: #64748b;">CEO, PeopleManager.co</p>
              <p class="muted-text" style="margin: 0 0 4px; font-size: 13px;">📞 +44 (0)20 8044 5235</p>
              <p class="muted-text" style="margin: 0 0 4px; font-size: 13px;">🌐 <a href="https://peoplemanager.co" style="color: #667eea !important; text-decoration: none; font-weight: 600;">peoplemanager.co</a></p>
              <p class="muted-text" style="margin: 0 0 20px; font-size: 13px;">📍 Vune1292, Compass Building, Al Hulaila Industrial Zone-FZ, UAE</p>
              <p class="muted-text" style="margin: 0 0 20px; font-size: 11px; line-height: 1.6; font-style: italic; max-width: 500px; margin-left: auto; margin-right: auto;">
                <strong>Confidentiality Notice:</strong> This email and any attachments are intended solely for the recipient and may contain confidential or legally privileged information. If you are not the intended recipient, please notify the sender immediately and delete this message.
              </p>
              <p class="secondary-text" style="margin: 0; font-size: 13px; color: #64748b;">©️ PeopleManager FZ-LLC · All rights reserved</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  {
    id: "satellite-telecommunications",
    name: "Satellite telecommunications activities",
    subject: "Transform Your Telecom Sales Training",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>PeopleManager - Transform Your Telecom Sales Training</title>
    <style>
        [data-ogsc] .stats-container,
        [data-ogsb] .stats-container {
            background-color: #1e293b !important;
        }
        
        @media (prefers-color-scheme: dark) {
            .email-body { background-color: #0f172a !important; }
            .content-card { background-color: #1e293b !important; }
            .highlight-box { background-color: rgba(102, 126, 234, 0.15) !important; }
            .stats-container { background-color: #0f172a !important; }
            .footer-bg { background-color: #1e293b !important; }
            
            .primary-text { color: #f1f5f9 !important; }
            .secondary-text { color: #cbd5e1 !important; }
            .muted-text { color: #94a3b8 !important; }
            
            .border-color { border-color: #475569 !important; }
            
            .stats-box { background-color: #0f172a !important; }
        }
        
        @media screen and (max-width: 600px) {
            .stats-container {
                background-color: transparent !important;
            }
        }
    </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
        <tr>
            <td style="padding: 50px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="content-card" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.12); overflow: hidden; max-width: 100%;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 50px 40px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            <h1 style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                                Build it once. Every rep learns it, proves it, and performs it.
                            </h1>
                            <p style="margin: 12px 0 0; font-size: 14px; color: #ffffff; font-weight: 500; letter-spacing: 2px; opacity: 0.95;">TRAIN · TRACK · TRANSFORM</p>
                        </td>
                    </tr>
                    
                    <!-- Rainbow Bar -->
                    <tr>
                        <td style="padding: 0; height: 6px; background: linear-gradient(90deg, #f093fb 0%, #f5576c 20%, #4facfe 40%, #00f2fe 60%, #43e97b 80%, #ffd700 100%);"></td>
                    </tr>
                    
                    <!-- Body Content -->
                    <tr>
                        <td class="content-card" style="padding: 40px 40px 30px; background-color: #ffffff;">
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Hi {{FirstName}} {{LastName}},
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Scaling a satellite or telecom business is tough. Good salespeople are expensive, hard to manage, and even harder to replace.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                <strong>PeopleManager</strong> gives you a system to build, train, and manage a commission-only sales force — without adding layers of management.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Every rep learns your offer, pricing, and process exactly the way you'd teach it.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                They're tested, certified, and tracked in real time — so you always know who's performing and who needs help.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #334155;">
                                We train it so you don't have to:
                            </p>
                            
                            <strong>
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Product & technical overview (coverage areas, bandwidth, install details)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Pricing & contract clarity (preventing discount drift)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Prospecting & appointment-setting scripts
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Demo delivery & pitch sequencing
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Objection handling & deal closing
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Compliance & disclosure standards
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • After-sale follow-up & installation coordination
                            </p>
                            </strong>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Managers get visibility, control, and accountability — without micromanagement.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Result: <strong>a scalable sales engine that grows revenue, not payroll.</strong>
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 40px; font-size: 16px; line-height: 1.6; color: #334155;">
                                If you'd like to explore how this could work for <strong>{{BusinessName}}</strong>, <strong>REPLY</strong> and we'll organise a quick strategy call with one of our telecom specialists.
                            </p>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer-bg" style="padding: 40px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                            <img src="https://peoplemanager.co/logo-full.png" alt="PeopleManager Logo" width="70" height="70" style="display: block; margin: 0 auto 20px; border-radius: 50%; border: 3px solid rgba(102, 126, 234, 0.3); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                            <p class="primary-text" style="margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #1e293b;">
                                Terence Murphy
                            </p>
                            <p class="secondary-text" style="margin: 0 0 16px; font-size: 14px; color: #64748b;">
                                CEO, PeopleManager.co
                            </p>
                            <p class="muted-text" style="margin: 0 0 4px; font-size: 13px; color: #94a3b8;">
                                📞 +44 (0)20 8044 5235
                            </p>
                            <p class="muted-text" style="margin: 0 0 4px; font-size: 13px; color: #94a3b8;">
                                🌐 <a href="https://peoplemanager.co" style="color: #667eea !important; text-decoration: none; font-weight: 600;">peoplemanager.co</a>
                            </p>
                            <p class="muted-text" style="margin: 0 0 20px; font-size: 13px; color: #94a3b8;">
                                📍 Vune1292, Compass Building, Al Hulaila Industrial Zone-FZ, UAE
                            </p>
                            <p class="muted-text" style="margin: 0 0 20px; font-size: 11px; line-height: 1.6; color: #94a3b8; font-style: italic; max-width: 500px; margin-left: auto; margin-right: auto;">
                                <strong>Confidentiality Notice:</strong> This email and any attachments are intended solely for the recipient and may contain confidential or legally privileged information. If you are not the intended recipient, please notify the sender immediately and delete this message.
                            </p>
                            <p class="secondary-text" style="margin: 0; font-size: 13px; color: #64748b;">
                                ©️ PeopleManager FZ-LLC · All rights reserved
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
  },
  {
    id: "gambling-betting",
    name: "Gambling and betting activities",
    subject: "Transform Your Gaming Compliance Training",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>PeopleManager - Transform Your Gaming Compliance Training</title>
    <style>
        [data-ogsc] .stats-container,
        [data-ogsb] .stats-container {
            background-color: #1e293b !important;
        }
        
        @media (prefers-color-scheme: dark) {
            .email-body { background-color: #0f172a !important; }
            .content-card { background-color: #1e293b !important; }
            .highlight-box { background-color: rgba(102, 126, 234, 0.15) !important; }
            .stats-container { background-color: #0f172a !important; }
            .footer-bg { background-color: #1e293b !important; }
            
            .primary-text { color: #f1f5f9 !important; }
            .secondary-text { color: #cbd5e1 !important; }
            .muted-text { color: #94a3b8 !important; }
            
            .border-color { border-color: #475569 !important; }
            
            .stats-box { background-color: #0f172a !important; }
        }
        
        @media screen and (max-width: 600px) {
            .stats-container {
                background-color: transparent !important;
            }
        }
    </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
        <tr>
            <td style="padding: 50px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="content-card" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.12); overflow: hidden; max-width: 100%;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 50px 40px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            <h1 style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                                Build it once. Every staff member learns it, proves it, and performs it.
                            </h1>
                            <p style="margin: 12px 0 0; font-size: 14px; color: #ffffff; font-weight: 500; letter-spacing: 2px; opacity: 0.95;">TRAIN · TRACK · TRANSFORM</p>
                        </td>
                    </tr>
                    
                    <!-- Rainbow Bar -->
                    <tr>
                        <td style="padding: 0; height: 6px; background: linear-gradient(90deg, #f093fb 0%, #f5576c 20%, #4facfe 40%, #00f2fe 60%, #43e97b 80%, #ffd700 100%);"></td>
                    </tr>
                    
                    <!-- Body Content -->
                    <tr>
                        <td class="content-card" style="padding: 40px 40px 30px; background-color: #ffffff;">
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Hi {{FirstName}} {{LastName}},
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                In gaming, one training gap can cost your licence.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Compliance, AML, and responsible gaming standards are non-negotiable — yet retraining staff every time someone leaves is a never-ending cycle.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                <strong>PeopleManager</strong> builds your compliance and service process into a permanent training system.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                New staff sit down, learn it, prove it, and work to your exact standards from day one.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #334155;">
                                We train it so you don't have to:
                            </p>
                            
                            <strong>
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Responsible gambling procedures (self-exclusion, intervention, referral)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • AML & KYC compliance (source of funds, identity verification)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Age-verification & refusal protocols
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Customer service & escalation handling
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Incident logging & reporting
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Data protection & confidentiality
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Retail service flow & cash-handling standards
                            </p>
                            </strong>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Supervisors see real-time training completion, certification, and compliance proof across every branch.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Result: <strong>fewer breaches, safer operations, and a culture of accountability that protects your licence.</strong>
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 40px; font-size: 16px; line-height: 1.6; color: #334155;">
                                If you'd like to see how this could work for <strong>{{BusinessName}}</strong>, <strong>REPLY</strong> and we'll arrange a short strategy call with one of our gaming-compliance specialists.
                            </p>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer-bg" style="padding: 40px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                            <img src="https://peoplemanager.co/logo-full.png" alt="PeopleManager Logo" width="70" height="70" style="display: block; margin: 0 auto 20px; border-radius: 50%; border: 3px solid rgba(102, 126, 234, 0.3); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                            <p class="primary-text" style="margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #1e293b;">
                                Terence Murphy
                            </p>
                            <p class="secondary-text" style="margin: 0 0 16px; font-size: 14px; color: #64748b;">
                                CEO, PeopleManager.co
                            </p>
                            <p class="muted-text" style="margin: 0 0 4px; font-size: 13px; color: #94a3b8;">
                                📞 +44 (0)20 8044 5235
                            </p>
                            <p class="muted-text" style="margin: 0 0 4px; font-size: 13px; color: #94a3b8;">
                                🌐 <a href="https://peoplemanager.co" style="color: #667eea !important; text-decoration: none; font-weight: 600;">peoplemanager.co</a>
                            </p>
                            <p class="muted-text" style="margin: 0 0 20px; font-size: 13px; color: #94a3b8;">
                                📍 Vune1292, Compass Building, Al Hulaila Industrial Zone-FZ, UAE
                            </p>
                            <p class="muted-text" style="margin: 0 0 20px; font-size: 11px; line-height: 1.6; color: #94a3b8; font-style: italic; max-width: 500px; margin-left: auto; margin-right: auto;">
                                <strong>Confidentiality Notice:</strong> This email and any attachments are intended solely for the recipient and may contain confidential or legally privileged information. If you are not the intended recipient, please notify the sender immediately and delete this message.
                            </p>
                            <p class="secondary-text" style="margin: 0; font-size: 13px; color: #64748b;">
                                ©️ PeopleManager FZ-LLC · All rights reserved
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
  },
  {
    id: "call-centres",
    name: "Activities of call centres",
    subject: "Transform Your Call Centre Training",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>PeopleManager - Transform Your Call Centre Training</title>
    <style>
        [data-ogsc] .stats-container,
        [data-ogsb] .stats-container {
            background-color: #1e293b !important;
        }
        
        @media (prefers-color-scheme: dark) {
            .email-body { background-color: #0f172a !important; }
            .content-card { background-color: #1e293b !important; }
            .highlight-box { background-color: rgba(102, 126, 234, 0.15) !important; }
            .stats-container { background-color: #0f172a !important; }
            .footer-bg { background-color: #1e293b !important; }
            
            .primary-text { color: #f1f5f9 !important; }
            .secondary-text { color: #cbd5e1 !important; }
            .muted-text { color: #94a3b8 !important; }
            
            .border-color { border-color: #475569 !important; }
            
            .stats-box { background-color: #0f172a !important; }
        }
        
        @media screen and (max-width: 600px) {
            .stats-container {
                background-color: transparent !important;
            }
        }
    </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
        <tr>
            <td style="padding: 50px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="content-card" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.12); overflow: hidden; max-width: 100%;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 50px 40px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            <h1 style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                                Build it once. Every new hire learns it, proves it, and performs it.
                            </h1>
                            <p style="margin: 12px 0 0; font-size: 14px; color: #ffffff; font-weight: 500; letter-spacing: 2px; opacity: 0.95;">TRAIN · TRACK · TRANSFORM</p>
                        </td>
                    </tr>
                    
                    <!-- Rainbow Bar -->
                    <tr>
                        <td style="padding: 0; height: 6px; background: linear-gradient(90deg, #f093fb 0%, #f5576c 20%, #4facfe 40%, #00f2fe 60%, #43e97b 80%, #ffd700 100%);"></td>
                    </tr>
                    
                    <!-- Body Content -->
                    <tr>
                        <td class="content-card" style="padding: 40px 40px 30px; background-color: #ffffff;">
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Hi {{FirstName}} {{LastName}},
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Every call centre has a few agents who just get it.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                They follow the script, handle objections, and close calls with confidence.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Now imagine if every new rep did the same — without you or your team leaders repeating training over and over again.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                <strong>PeopleManager</strong> turns your best call scripts and standards into a plug-and-play training system.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                New agents sit down, learn it, prove it, and perform it — every shift, every campaign.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #334155;">
                                We train it so you don't have to:
                            </p>
                            
                            <strong>
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Call-flow mastery (greeting, discovery, objection handling, close)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Tone & empathy coaching (live examples, feedback loops)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Compliance statements & disclosure accuracy
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Data-protection and verification procedures
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Customer recovery & escalation handling
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Upsell & cross-sell conversation flow
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • After-call wrap & note-taking discipline
                            </p>
                            </strong>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Supervisors see live progress, QA scores, and who's off-track — before quality drops.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Result: <strong>higher conversion, tighter compliance, and faster onboarding — without extra management hours.</strong>
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 40px; font-size: 16px; line-height: 1.6; color: #334155;">
                                If you'd like to explore how this could work for <strong>{{BusinessName}}</strong>, <strong>REPLY</strong> and we'll arrange a quick strategy call with one of our call-centre specialists.
                            </p>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer-bg" style="padding: 40px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                            <img src="https://peoplemanager.co/logo-full.png" alt="PeopleManager Logo" width="70" height="70" style="display: block; margin: 0 auto 20px; border-radius: 50%; border: 3px solid rgba(102, 126, 234, 0.3); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                            <p class="primary-text" style="margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #1e293b;">
                                Terence Murphy
                            </p>
                            <p class="secondary-text" style="margin: 0 0 16px; font-size: 14px; color: #64748b;">
                                CEO, PeopleManager.co
                            </p>
                            <p class="muted-text" style="margin: 0 0 4px; font-size: 13px; color: #94a3b8;">
                                📞 +44 (0)20 8044 5235
                            </p>
                            <p class="muted-text" style="margin: 0 0 4px; font-size: 13px; color: #94a3b8;">
                                🌐 <a href="https://peoplemanager.co" style="color: #667eea !important; text-decoration: none; font-weight: 600;">peoplemanager.co</a>
                            </p>
                            <p class="muted-text" style="margin: 0 0 20px; font-size: 13px; color: #94a3b8;">
                                📍 Vune1292, Compass Building, Al Hulaila Industrial Zone-FZ, UAE
                            </p>
                            <p class="muted-text" style="margin: 0 0 20px; font-size: 11px; line-height: 1.6; color: #94a3b8; font-style: italic; max-width: 500px; margin-left: auto; margin-right: auto;">
                                <strong>Confidentiality Notice:</strong> This email and any attachments are intended solely for the recipient and may contain confidential or legally privileged information. If you are not the intended recipient, please notify the sender immediately and delete this message.
                            </p>
                            <p class="secondary-text" style="margin: 0; font-size: 13px; color: #64748b;">
                                ©️ PeopleManager FZ-LLC · All rights reserved
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
  },
  {
    id: "retail-computers",
    name: "Retail sale of computers; peripheral units and software in specialised stores",
    subject: "Transform Your Tech Retail Training",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>PeopleManager - Transform Your Tech Retail Training</title>
    <style>
        [data-ogsc] .stats-container,
        [data-ogsb] .stats-container {
            background-color: #1e293b !important;
        }
        
        @media (prefers-color-scheme: dark) {
            .email-body { background-color: #0f172a !important; }
            .content-card { background-color: #1e293b !important; }
            .highlight-box { background-color: rgba(102, 126, 234, 0.15) !important; }
            .stats-container { background-color: #0f172a !important; }
            .footer-bg { background-color: #1e293b !important; }
            
            .primary-text { color: #f1f5f9 !important; }
            .secondary-text { color: #cbd5e1 !important; }
            .muted-text { color: #94a3b8 !important; }
            
            .border-color { border-color: #475569 !important; }
            
            .stats-box { background-color: #0f172a !important; }
        }
        
        @media screen and (max-width: 600px) {
            .stats-container {
                background-color: transparent !important;
            }
        }
    </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
        <tr>
            <td style="padding: 50px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="content-card" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.12); overflow: hidden; max-width: 100%;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 50px 40px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            <h1 style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                                Build it once. Every new hire learns it, proves it, and performs it.
                            </h1>
                            <p style="margin: 12px 0 0; font-size: 14px; color: #ffffff; font-weight: 500; letter-spacing: 2px; opacity: 0.95;">TRAIN · TRACK · TRANSFORM</p>
                        </td>
                    </tr>
                    
                    <!-- Rainbow Bar -->
                    <tr>
                        <td style="padding: 0; height: 6px; background: linear-gradient(90deg, #f093fb 0%, #f5576c 20%, #4facfe 40%, #00f2fe 60%, #43e97b 80%, #ffd700 100%);"></td>
                    </tr>
                    
                    <!-- Body Content -->
                    <tr>
                        <td class="content-card" style="padding: 40px 40px 30px; background-color: #ffffff;">
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Hi {{FirstName}} {{LastName}},
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Every tech store has one salesperson who just gets it.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                They know the specs, ask the right questions, and close sales with confidence.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Now imagine if every new hire sold like that — without you or your managers repeating training, week after week.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                <strong>PeopleManager</strong> turns your best in-store process into a plug-and-play training system.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                New hires sit down, learn it, prove it, and sell with confidence from day one.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #334155;">
                                We train it so you don't have to:
                            </p>
                            
                            <strong>
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Product knowledge & technical specs (hardware, software, peripherals)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Customer discovery & needs assessment
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Demo & feature presentation (clear benefits, natural flow)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Upselling & bundle building (maximize ticket value)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Warranty, finance & compliance procedures
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • After-sales support & returns handling
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Customer experience & service recovery
                            </p>
                            </strong>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Managers see live progress, sales-readiness scores, and where staff need more support — before performance dips.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Result: <strong>faster onboarding, higher conversion, and complete sales consistency across every store.</strong>
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 40px; font-size: 16px; line-height: 1.6; color: #334155;">
                                If you'd like to see how this could work for <strong>{{BusinessName}}</strong>, <strong>REPLY</strong> and we'll arrange a quick strategy call with one of our retail experts.
                            </p>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer-bg" style="padding: 40px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                            <img src="https://peoplemanager.co/logo-full.png" alt="PeopleManager Logo" width="70" height="70" style="display: block; margin: 0 auto 20px; border-radius: 50%; border: 3px solid rgba(102, 126, 234, 0.3); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                            <p class="primary-text" style="margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #1e293b;">
                                Terence Murphy
                            </p>
                            <p class="secondary-text" style="margin: 0 0 16px; font-size: 14px; color: #64748b;">
                                CEO, PeopleManager.co
                            </p>
                            <p class="muted-text" style="margin: 0 0 4px; font-size: 13px; color: #94a3b8;">
                                📞 +44 (0)20 8044 5235
                            </p>
                            <p class="muted-text" style="margin: 0 0 4px; font-size: 13px; color: #94a3b8;">
                                🌐 <a href="https://peoplemanager.co" style="color: #667eea !important; text-decoration: none; font-weight: 600;">peoplemanager.co</a>
                            </p>
                            <p class="muted-text" style="margin: 0 0 20px; font-size: 13px; color: #94a3b8;">
                                📍 Vune1292, Compass Building, Al Hulaila Industrial Zone-FZ, UAE
                            </p>
                            <p class="muted-text" style="margin: 0 0 20px; font-size: 11px; line-height: 1.6; color: #94a3b8; font-style: italic; max-width: 500px; margin-left: auto; margin-right: auto;">
                                <strong>Confidentiality Notice:</strong> This email and any attachments are intended solely for the recipient and may contain confidential or legally privileged information. If you are not the intended recipient, please notify the sender immediately and delete this message.
                            </p>
                            <p class="secondary-text" style="margin: 0; font-size: 13px; color: #64748b;">
                                ©️ PeopleManager FZ-LLC · All rights reserved
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
  },
  {
    id: "licensed-restaurants",
    name: "Licenced restaurants",
    subject: "Transform Your Restaurant Training",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>PeopleManager - Transform Your Restaurant Training</title>
    <style>
        [data-ogsc] .stats-container,
        [data-ogsb] .stats-container {
            background-color: #1e293b !important;
        }
        
        @media (prefers-color-scheme: dark) {
            .email-body { background-color: #0f172a !important; }
            .content-card { background-color: #1e293b !important; }
            .highlight-box { background-color: rgba(102, 126, 234, 0.15) !important; }
            .stats-container { background-color: #0f172a !important; }
            .footer-bg { background-color: #1e293b !important; }
            
            .primary-text { color: #f1f5f9 !important; }
            .secondary-text { color: #cbd5e1 !important; }
            .muted-text { color: #94a3b8 !important; }
            
            .border-color { border-color: #475569 !important; }
            
            .stats-box { background-color: #0f172a !important; }
        }
        
        @media screen and (max-width: 600px) {
            .stats-container {
                background-color: transparent !important;
            }
        }
    </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
        <tr>
            <td style="padding: 50px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="content-card" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.12); overflow: hidden; max-width: 100%;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 50px 40px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            <h1 style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
        Build it once. Every new hire learns it, proves it, and performs it.
                            </h1>
                            <p style="margin: 12px 0 0; font-size: 14px; color: #ffffff; font-weight: 500; letter-spacing: 2px; opacity: 0.95;">TRAIN · TRACK · TRANSFORM</p>
                        </td>
                    </tr>
                    
                    <!-- Rainbow Bar -->
                    <tr>
                        <td style="padding: 0; height: 6px; background: linear-gradient(90deg, #f093fb 0%, #f5576c 20%, #4facfe 40%, #00f2fe 60%, #43e97b 80%, #ffd700 100%);"></td>
                    </tr>
                    
                    <!-- Body Content -->
                    <tr>
                        <td class="content-card" style="padding: 40px 40px 30px; background-color: #ffffff;">
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Hi {{FirstName}} {{LastName}},
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Every restaurant has one server who just gets it. Imagine if every new hire walked in and worked like that — without you or your managers repeating the same training for the 100th time.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                <strong>PeopleManager</strong> turns your best way of working into a plug-and-play training system. New staff sit down, learn it, prove it, and hit the floor ready.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #334155;">
                                We train it so you don't have to:
                            </p>
                            <strong>
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Menu mastery & allergen handling (incl. Natasha's Law compliance)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Upselling & cross-selling (what to offer, when to offer, phrasing that feels natural)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Sequence of service & guest etiquette (greet, check-back, resolve, farewell)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • POS use & payments (speed, accuracy, comps/voids, tips)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Opening/closing & side work (so every shift runs tight)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Food safety & hygiene basics
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Age-verification & refusal skills (Challenge 25, accepted IDs)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Customer service & complaint handling (recover tables fast, protect reviews)
                            </p>
                            </strong>
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Managers see live progress, quizzes certify competence, and refreshers trigger automatically when standards slip.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Result: <strong>ramp-up, tighter consistency, and less turnover caused by poor or inconsistent training.</strong> 
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 40px; font-size: 16px; line-height: 1.6; color: #334155;">
                                If you'd like to explore how this could work for <strong>{{BusinessName}}</strong>, <strong>REPLY</strong>  and we'll organise a quick strategy call with one of our restaurant-training experts.
                            </p>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer-bg" style="padding: 40px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                            <img src="https://peoplemanager.co/logo-full.png" alt="PeopleManager Logo" width="70" height="70" style="display: block; margin: 0 auto 20px; border-radius: 50%; border: 3px solid rgba(102, 126, 234, 0.3); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                            <p class="primary-text" style="margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #1e293b;">
                                Terence Murphy
                            </p>
                            <p class="secondary-text" style="margin: 0 0 16px; font-size: 14px; color: #64748b;">
                                CEO, PeopleManager.co
                            </p>
                            <p class="muted-text" style="margin: 0 0 4px; font-size: 13px; color: #94a3b8;">
                                📞 +44 (0)20 8044 5235
                            </p>
                            <p class="muted-text" style="margin: 0 0 4px; font-size: 13px; color: #94a3b8;">
                                🌐 <a href="https://peoplemanager.co" style="color: #667eea !important; text-decoration: none; font-weight: 600;">peoplemanager.co</a>
                            </p>
                            <p class="muted-text" style="margin: 0 0 20px; font-size: 13px; color: #94a3b8;">
                                📍 Vune1292, Compass Building, Al Hulaila Industrial Zone-FZ, UAE
                            </p>
                            <p class="muted-text" style="margin: 0 0 20px; font-size: 11px; line-height: 1.6; color: #94a3b8; font-style: italic; max-width: 500px; margin-left: auto; margin-right: auto;">
                                <strong>Confidentiality Notice:</strong> This email and any attachments are intended solely for the recipient and may contain confidential or legally privileged information. If you are not the intended recipient, please notify the sender immediately and delete this message.
                            </p>
                            <p class="secondary-text" style="margin: 0; font-size: 13px; color: #64748b;">
                                ©️ PeopleManager FZ-LLC · All rights reserved
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
  },
  {
    id: "hotels-accommodation",
    name: "Hotels and similar accommodation",
    subject: "Transform Your Hotel Training",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>PeopleManager - Transform Your Hotel Training</title>
    <style>
        [data-ogsc] .stats-container,
        [data-ogsb] .stats-container {
            background-color: #1e293b !important;
        }
        
        @media (prefers-color-scheme: dark) {
            .email-body { background-color: #0f172a !important; }
            .content-card { background-color: #1e293b !important; }
            .highlight-box { background-color: rgba(102, 126, 234, 0.15) !important; }
            .stats-container { background-color: #0f172a !important; }
            .footer-bg { background-color: #1e293b !important; }
            
            .primary-text { color: #f1f5f9 !important; }
            .secondary-text { color: #cbd5e1 !important; }
            .muted-text { color: #94a3b8 !important; }
            
            .border-color { border-color: #475569 !important; }
            
            .stats-box { background-color: #0f172a !important; }
        }
        
        @media screen and (max-width: 600px) {
            .stats-container {
                background-color: transparent !important;
            }
        }
    </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);">
        <tr>
            <td style="padding: 50px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="content-card" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.12); overflow: hidden; max-width: 100%;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 50px 40px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            <h1 style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                                Build it once. Every new hire learns it, proves it, and performs it.
                            </h1>
                            <p style="margin: 12px 0 0; font-size: 14px; color: #ffffff; font-weight: 500; letter-spacing: 2px; opacity: 0.95;">TRAIN · TRACK · TRANSFORM</p>
                        </td>
                    </tr>
                    
                    <!-- Rainbow Bar -->
                    <tr>
                        <td style="padding: 0; height: 6px; background: linear-gradient(90deg, #f093fb 0%, #f5576c 20%, #4facfe 40%, #00f2fe 60%, #43e97b 80%, #ffd700 100%);"></td>
                    </tr>
                    
                    <!-- Body Content -->
                    <tr>
                        <td class="content-card" style="padding: 40px 40px 30px; background-color: #ffffff;">
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Hi {{FirstName}} {{LastName}},
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Every hotel has one employee who just gets it.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                They know how to greet guests, handle complaints, and make service feel effortless.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Now imagine if every new hire did the same — without you or your managers repeating the training, shift after shift.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                <strong>PeopleManager</strong> turns your best way of working into a plug-and-play training system.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                New team members sit down, learn it, prove it, and deliver consistency across every department.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #334155;">
                                We train it so you don't have to:
                            </p>
                            
                            <strong>
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Front-desk check-in scripts and complaint recovery
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Room preparation & housekeeping standards (cleaning order, sign-off checks)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Guest etiquette across departments (tone, language, body language)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Upselling rooms, add-ons, and experiences
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Restaurant & bar service flow (table setup, cross-sell, payment handling)
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Hygiene, safety & incident procedures
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155; padding-left: 20px;">
                                • Cross-department handover protocols
                            </p>
                            </strong>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Managers see live progress, training scores, and instant proof that standards are being followed.
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
                                Result: <strong>consistent guest experience, faster onboarding, and fewer costly retraining cycles.</strong>
                            </p>
                            
                            <p class="primary-text" style="margin: 0 0 40px; font-size: 16px; line-height: 1.6; color: #334155;">
                                If you'd like to see how this could work for <strong>{{BusinessName}}</strong>, <strong>REPLY</strong> and we'll arrange a short strategy call with one of our hospitality experts.
                            </p>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer-bg" style="padding: 40px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                            <img src="https://peoplemanager.co/logo-full.png" alt="PeopleManager Logo" width="70" height="70" style="display: block; margin: 0 auto 20px; border-radius: 50%; border: 3px solid rgba(102, 126, 234, 0.3); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                            <p class="primary-text" style="margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #1e293b;">
                                Terence Murphy
                            </p>
                            <p class="secondary-text" style="margin: 0 0 16px; font-size: 14px; color: #64748b;">
                                CEO, PeopleManager.co
                            </p>
                            <p class="muted-text" style="margin: 0 0 4px; font-size: 13px; color: #94a3b8;">
                                📞 +44 (0)20 8044 5235
                            </p>
                            <p class="muted-text" style="margin: 0 0 4px; font-size: 13px; color: #94a3b8;">
                                🌐 <a href="https://peoplemanager.co" style="color: #667eea !important; text-decoration: none; font-weight: 600;">peoplemanager.co</a>
                            </p>
                            <p class="muted-text" style="margin: 0 0 20px; font-size: 13px; color: #94a3b8;">
                                📍 Vune1292, Compass Building, Al Hulaila Industrial Zone-FZ, UAE
                            </p>
                            <p class="muted-text" style="margin: 0 0 20px; font-size: 11px; line-height: 1.6; color: #94a3b8; font-style: italic; max-width: 500px; margin-left: auto; margin-right: auto;">
                                <strong>Confidentiality Notice:</strong> This email and any attachments are intended solely for the recipient and may contain confidential or legally privileged information. If you are not the intended recipient, please notify the sender immediately and delete this message.
                            </p>
                            <p class="secondary-text" style="margin: 0; font-size: 13px; color: #64748b;">
                                ©️ PeopleManager FZ-LLC · All rights reserved
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
  }
]

const TWILIO_TEMPLATES: any[] = [
  {
    id: "pock_clients_5",
    name: "IHT Results Check",
    sid: "HX607ae0eff855b6b33529f61484e9fe09",
    content: "Hi [First Name], I was looking over your IHT results and wanted to check one thing. Can I?",
    language: "en_GB",
    type: "text",
    channels: ["whatsapp", "sms"]
  },
  {
    id: "pock_clients_4", 
    name: "IHT Summary Offer",
    sid: "HX3b562b34f09d0bd95e4a964aac9b9a64",
    content: "Hi [First Name], quick thought: would you like me to summarise your IHT result in plain English?",
    language: "en_GB",
    type: "text",
    channels: ["whatsapp", "sms"]
  },
  {
    id: "pock_clients_3",
    name: "Quick Question",
    sid: "HX773c64fae404830505687ced83cb5eb9",
    content: "Hi [First Name], can I ask you something quick? No rush—reply whenever works for you.",
    language: "en_GB", 
    type: "text",
    channels: ["whatsapp", "sms"]
  },
  {
    id: "pock_clients_2",
    name: "Simple Question",
    sid: "HX9026d984961c83ccd1043784bd5f42ac",
    content: "Hi [First Name], I know life's full on—could I ask you just one simple question when you get a moment?",
    language: "en_GB",
    type: "text", 
    channels: ["whatsapp", "sms"]
  },
  {
    id: "pock_clients_1",
    name: "Short Promise",
    sid: "HX2b7eb04b270206b318c394aea043e15f",
    content: "Hey [First Name], I promise I'll keep this short—mind if I ask you a quick one?",
    language: "en_GB",
    type: "text",
    channels: ["whatsapp", "sms"]
  },
  {
    id: "interview_reminder",
    name: "Interview Reminder - Account Manager",
    sid: "HX6c60bbad60a7d3c7e5afcf61c93dc6f3",
    content: "Dear {{1}} We would like to remind you about your interview for the Account Manager role today at  {{2}}.  Please join using the Teams link invite sent previously by email. Kind regards, {{3}}, Recruitment Team",
    language: "en_GB",
    type: "text",
    channels: ["whatsapp", "sms"]
  }
]

const GUIDE_TYPES: string[] = []

// Helper to check if WhatsApp messaging is allowed (24-hour policy)
function canSendWhatsAppMessage(messages: CombinedMessage[]): { allowed: boolean; lastClientMessage?: Date; reason?: string } {
  if (messages.length === 0) {
    return { allowed: false, reason: "No previous conversation exists" };
  }

  // Find the last client-initiated WhatsApp message
  const clientWhatsAppMessages = messages
    .filter(msg => 
      msg.channel === "whatsapp" && 
      msg.isIncoming && // Client messages are incoming (from client to us)
      msg.author !== "system" &&
      msg.author !== "whatsapp:+447307208994" &&
      msg.author !== "whatsapp:+447367835651" &&
      msg.author !== "whatsapp:+447360543337" &&
      msg.author !== "+447367835651" &&
      msg.author !== "+447360543337"
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (clientWhatsAppMessages.length === 0) {
    return { allowed: false, reason: "No client-initiated WhatsApp messages found" };
  }

  const lastClientMessage = new Date(clientWhatsAppMessages[0].timestamp);
  const now = new Date();
  const hoursSinceLastMessage = (now.getTime() - lastClientMessage.getTime()) / (1000 * 60 * 60);

  if (hoursSinceLastMessage > 24) {
    return { 
      allowed: false, 
      lastClientMessage,
      reason: `Last client message was ${Math.floor(hoursSinceLastMessage)} hours ago` 
    };
  }

  return { allowed: true, lastClientMessage };
}

// MediaDisplay component to handle different media types
const MediaDisplay = ({ media, messageSid, conversationSid }: { media: any, messageSid: string, conversationSid: string }) => {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getMediaIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4 mr-2" />
    } else if (contentType.startsWith('video/')) {
      return <Video className="h-4 w-4 mr-2" />
    } else if (contentType.startsWith('audio/')) {
      return <Headphones className="h-4 w-4 mr-2" />
    } else if (contentType === 'application/pdf') {
      return <FileText className="h-4 w-4 mr-2" />
    }
    return <File className="h-4 w-4 mr-2" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const fetchMediaUrl = useCallback(async () => {
    if (!media?.sid) return null;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/twilio/media/${media.sid}?messageSid=${encodeURIComponent(messageSid)}&conversationSid=${encodeURIComponent(conversationSid)}`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load media');
      }
      setMediaUrl(data.media.url);
      return data.media.url as string;
    } catch (err) {
      console.error('Error fetching media:', err);
      setError('Failed to load media');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [media?.sid, messageSid, conversationSid]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    let url = mediaUrl;
    if (!url) {
      url = await fetchMediaUrl();
      if (!url) return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = media.filename || `media-${media.sid}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = async (e: React.MouseEvent) => {
    e.stopPropagation();
    let url = mediaUrl;
    if (!url) {
      url = await fetchMediaUrl();
      if (!url) return;
    }
    window.open(url, '_blank');
  };

  if (!media) return null

  return (
    <div className="mt-2 border rounded-md p-2 bg-gray-50 dark:bg-gray-800">
      <div className="flex items-center">
        {getMediaIcon(media.content_type || 'application/octet-stream')}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {media.filename || `media-${media.sid?.substring(0, 8)}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {media.content_type} • {formatFileSize(media.size || 0)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          disabled={isLoading}
          className="ml-2"
          title="Download"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
        {(media.content_type?.startsWith('image/') || media.content_type === 'application/pdf') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreview}
            disabled={isLoading}
            className="ml-2 text-xs text-black"
            title="Preview"
          >
            Preview
          </Button>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
      {mediaUrl && media.content_type?.startsWith('image/') && (
        <div className="mt-2">
          <img
            src={mediaUrl}
            alt={media.filename || 'Image attachment'}
            className="max-w-full h-auto rounded-md border"
            loading="lazy"
          />
        </div>
      )}
      {mediaUrl && media.content_type === 'application/pdf' && (
        <div className="mt-2">
          <iframe
            src={mediaUrl}
            className="w-full h-64 border rounded-md"
            title={media.filename || 'PDF document'}
          />
        </div>
      )}
    </div>
  )
}

// Helper functions
function shouldHideName(Name: string): boolean {
  const hiddenValues = ['unknown', 'n/a', 'na', 'none', ''];
  const normalizedName = Name?.toLowerCase().trim();
  return hiddenValues.includes(normalizedName);
}

function getDisplayName(firstName?: string, lastName?: string): string {
  const first = firstName || '';
  const last = lastName || '';
  
  if (shouldHideName(first) && shouldHideName(last)) {
    return '';
  } else if (shouldHideName(first)) {
    return `${last}`;
  } else if (shouldHideName(last)) {
    return `${first}`;
  }
  return `${first} ${last}`.trim();
}

function formatMessageTimestamp(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (isToday) {
    return `Today at ${time}`
  } else if (isYesterday) {
    return `Yesterday at ${time}`
  } else {
    return date.toLocaleDateString([], { year: "numeric", month: "long", day: "2-digit" }) + " at " + time
  }
}

const getChannelIcon = (channel: string) => {
  switch (channel) {
    case "email":
      return <Mail className="h-4 w-4" />
    case "whatsapp":
      return <svg className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="none"><g><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.67.15-.198.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.571-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.363.71.306 1.263.489 1.695.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.288.173-1.413-.074-.124-.272-.198-.57-.347z" /><path fill="currentColor" d="M12.004 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.462 3.479 1.338 4.995L2.003 22l5.13-1.342c1.47.805 3.13 1.245 4.87 1.245 5.514 0 9.997-4.483 9.997-9.997 0-2.666-1.04-5.17-2.929-7.06C17.174 3.043 14.67 2.003 12.004 2.003zm0 17.995c-1.57 0-3.104-.418-4.44-1.21l-.318-.188-3.045.797.812-2.97-.206-.306c-.82-1.22-1.25-2.64-1.25-4.108 0-4.135 3.364-7.5 7.5-7.5 2.003 0 3.89.78 5.304 2.195 1.414 1.414 2.196 3.3 2.196 5.304 0 4.135-3.365 7.5-7.5 7.5z" /></g></svg>
    case "sms":
      return <Phone className="h-4 w-4 text-blue-600" />
    default:
      return <Mail className="h-4 w-4" />
  }
}

const getChannelColor = (channel: string) => {
  switch (channel) {
    case "email":
      return "bg-gray-100 text-gray-700"
    case "whatsapp":
      return "bg-green-100 text-green-700"
    case "sms":
      return "bg-blue-100 text-blue-700"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

type Lead = {
  id: string
  contact_first_name?: string
  contact_last_name?: string
  contact_email?: string
  company_email?: string
  business_telephone?: string
  mobile_phone?: string
  current_status?: string
}

interface Message {
  id: string | number
  sender: string
  message: string
  subject?: string
  timestamp: string
  isIncoming: boolean
  status?: "sent" | "processed" | "error" | "delivered" | "open" | "not_delivered" | "bounce"
  channelType?: "sms" | "whatsapp"
  /** Not present on public.email_messages in PM; kept for optional legacy/API shapes */
  event_name?: "delivered" | "processed" | "bounce"
  delivery?: {
    read?: "all" | "some" | "none"
    delivered?: "all" | "some" | "none"
  }
  read?: "all" | "some" | "none"
  delivered?: "all" | "some" | "none"
  author?: string
  channel: string
  media?: any[]
  open_count?: number
  click_count?: number
}

type Channel = "email" | "sms" | "whatsapp"
type CombinedMessage = Message

interface Call {
  id: number
  created_at: string
  lead_first_name?: string
  lead_phone?: string
  advisor_name?: string
  summary?: string
  analysis?: string
  lead_last_name?: string
  call_score?: number
  lead_id?: string
  advisor_id?: string
  transcript?: string
  call_status?: string
  call_ended_reason?: string
}

// Call Display Component – all calls shown as from our team (outbound-style)
const CallDisplay = ({ call }: { call: Call }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false)
  
  return (
    <div className="flex gap-3 w-full max-w-full justify-end">
      <div className="flex flex-col min-w-0 max-w-[75%] items-end text-right">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">Call</span>
          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 flex-shrink-0">
            <Phone className="h-3 w-3 mr-1" />
            Call
          </Badge>
        </div>
        <div className="flex flex-col items-end w-full">
          <Card className="p-3 w-full overflow-hidden bg-blue-500 text-white rounded-br-none border-0 shadow-sm">
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium text-blue-100">IAM:</span>
                <span className="ml-2 text-white truncate">{call.advisor_name || 'Not specified'}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-blue-100">End Reason:</span>
                <span className="ml-2 text-white truncate">{call.call_ended_reason || 'Not specified'}</span>
              </div>
              {call.analysis && (
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
                    className="text-blue-100 hover:bg-white/15 hover:text-blue-50 p-0 h-auto text-xs"
                  >
                    {isAnalysisExpanded ? 'Hide' : 'Show'} Analysis
                  </Button>
                  {isAnalysisExpanded && (
                    <div className="mt-2 p-3 bg-white/20 border border-white/30 rounded-md max-h-60 overflow-y-auto">
                      <div className="text-sm text-white whitespace-pre-wrap break-words">
                        {call.analysis}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {call.transcript && (
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-blue-100 hover:bg-white/15 hover:text-blue-50 p-0 h-auto text-xs"
                  >
                    {isExpanded ? 'Hide' : 'Show'} Transcript
                  </Button>
                  {isExpanded && (
                    <div className="mt-2 p-3 bg-white/20 border border-white/30 rounded-md max-h-60 overflow-y-auto">
                      <div className="text-sm text-white whitespace-pre-wrap break-words">
                        {call.transcript}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
          <span className="text-xs text-muted-foreground mt-1">{formatMessageTimestamp(call.created_at)}</span>
        </div>
      </div>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="bg-blue-500 text-white font-semibold">
          <Phone className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    </div>
  )
}

export function LeadConversationPanel({ leadId }: { leadId: string }) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [subject, setSubject] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [showComposeDialog, setShowComposeDialog] = useState(false)
  const [thread, setThread] = useState<CombinedMessage[]>([])
  const [lastUsedChannel, setLastUsedChannel] = useState<Channel>("email")
  const [activeConversation, setActiveConversation] = useState<any>(null)
  const [calls, setCalls] = useState<Call[]>([])
  const [combinedTimeline, setCombinedTimeline] = useState<Array<{ type: 'message' | 'call', data: any, timestamp: string }>>([])
  const [showNotesDialog, setShowNotesDialog] = useState(false)
  const [notes, setNotes] = useState("")
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [composeMode, setComposeMode] = useState<"template" | "text">("text")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [selectedTwilioTemplateId, setSelectedTwilioTemplateId] = useState<string>("")
  const [showTwilioTemplateDialog, setShowTwilioTemplateDialog] = useState(false)
  const [showEmailTemplateDialog, setShowEmailTemplateDialog] = useState(false)
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({})
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [includeSignature, setIncludeSignature] = useState(true)
  const [userPhoneNumber, setUserPhoneNumber] = useState<string>("")
  const [loadError, setLoadError] = useState<string | null>(null)

  const supabase = createClient()

  // Generate email signature with user's phone number
  const generateSignature = (phoneNumber: string) => {
    if (!phoneNumber) return "";
    
    // Remove leading 0 if present
    const formattedPhone = phoneNumber.replace(/^0/, '');
    
    return `
      <br><br>
      <p>
        Business Development Associate<br>
        PeopleManager.co<br>
        +44 (0)${formattedPhone}<br>
        Vune1292<br>
        Compass Building<br>
        Al Hulaila Industrial, Zone-FZ UAE Vune1292<br>
        <a href="https://peoplemanager.co" style="color:#0073e6; text-decoration:none;">https://peoplemanager.co</a><br><br>
        Confidentiality Notice: This email and any attachments are intended solely for the recipient and may contain confidential or legally privileged information.
        If you are not the intended recipient, please notify the sender immediately and delete this message.<br><br>
        © PeopleManager FZ-LLC · All rights reserved.
      </p>
      <p>
        <img src="https://peoplemanager.co/logo-full.png" alt="PeopleManager Logo" style="width:120px; margin-top:10px;">
      </p>
    `;
  };

  // Get selected template objects
  const selectedTemplate = EMAIL_TEMPLATES.find((t) => t.id === selectedTemplateId)
  const selectedTwilioTemplate = TWILIO_TEMPLATES.find((t) => t.id === selectedTwilioTemplateId)

  // Function to extract variables from template
  const extractTemplateVariables = (template: any) => {
    if (!template) return {}
    
    const variables: Record<string, string> = {}
    const matches = template.html.match(/\{\{([^}]+)\}\}/g)
    
    if (matches) {
      matches.forEach((match: string) => {
        const varName = match.replace(/\{\{|\}\}/g, '')
        if (!variables[varName]) {
          // Initialize with lead data or defaults
          const leadData = lead || {} as any
          switch (varName) {
            case 'FirstName':
              variables[varName] = leadData.contact_first_name || 'there'
              break
            case 'LastName':
              variables[varName] = leadData.contact_last_name || ''
              break
            case 'FullName':
              variables[varName] = `${leadData.contact_first_name || ''} ${leadData.contact_last_name || ''}`.trim() || 'there'
              break
            case 'BusinessName':
            case 'CompanyName':
              variables[varName] = leadData.business_name || 'your business'
              break
            case 'Email':
              variables[varName] = leadData.contact_email || leadData.company_email || ''
              break
            case 'Phone':
              variables[varName] = leadData.business_telephone || leadData.mobile_phone || ''
              break
            case 'Industry':
              variables[varName] = leadData.industry || 'your industry'
              break
            default:
              variables[varName] = ''
          }
        }
      })
    }
    
    return variables
  }

  // Function to replace template variables with lead data or custom values
  const replaceTemplateVariables = (text: string, customVariables?: Record<string, string>) => {
    const variables = customVariables || templateVariables
    const leadData = lead || {} as any
    
    return text
      .replace(/\{\{FirstName\}\}/g, variables.FirstName || leadData.contact_first_name || 'there')
      .replace(/\{\{LastName\}\}/g, variables.LastName || leadData.contact_last_name || '')
      .replace(/\{\{FullName\}\}/g, variables.FullName || `${leadData.contact_first_name || ''} ${leadData.contact_last_name || ''}`.trim() || 'there')
      .replace(/\{\{BusinessName\}\}/g, variables.BusinessName || leadData.business_name || 'your business')
      .replace(/\{\{CompanyName\}\}/g, variables.CompanyName || leadData.business_name || 'your company')
      .replace(/\{\{Email\}\}/g, variables.Email || leadData.contact_email || leadData.company_email || '')
      .replace(/\{\{Phone\}\}/g, variables.Phone || leadData.business_telephone || leadData.mobile_phone || '')
      .replace(/\{\{Industry\}\}/g, variables.Industry || leadData.industry || 'your industry')
  }

  // Initialize template variables when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      const extractedVars = extractTemplateVariables(selectedTemplate)
      setTemplateVariables(extractedVars)
    }
  }, [selectedTemplate, lead])

  // Check WhatsApp policy compliance
  const whatsappPolicy = canSendWhatsAppMessage(thread)

  // Generate avatars
  const clientAvatar = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent("Client")}&backgroundColor=b6e3f4&eyes=cute&mouth=smileLol`;
  const userAvatar = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=You&backgroundColor=c0aede&eyes=plain&mouth=wideSmile`;

  useEffect(() => {
    async function loadLead() {
      setLoadError(null) // Reset error state
      try {
        const rpcRes = await supabase
          .rpc("get_lead_conversation_bundle", {
            p_lead_id: String(leadId),
            p_email_limit: 500,
            p_whatsapp_limit: 500,
            p_calls_limit: 200,
          })
          .single();
        const data = rpcRes.data as any;
        const error = rpcRes.error as any;

        if (error) throw error;
        const leadData = (data?.lead || null) as any;
        const conversation = (data?.active_conversation || null) as any;
        const callsData = (data?.calls || []) as any[];
        const emailMsgs = (data?.email_messages || []) as any[];
        const dbWhatsAppMessages = (data?.whatsapp_messages || []) as any[];

        setLead(leadData);
        setActiveConversation(conversation);
        setCalls((callsData as unknown as Call[]) || []);

        if (!leadData?.id) {
          setThread([]);
          setCombinedTimeline([]);
          setLoading(false);
          return;
        }

        const emailMessages: CombinedMessage[] = (emailMsgs || [])
          .sort(
            (a: any, b: any) =>
              new Date(String(a.created_at || a.last_update)).getTime() - new Date(String(b.last_update || b.created_at)).getTime(),
          )
          .map((msg: any) => ({
            id: msg.id,
            sender: msg.direction === "Inbound" ? getDisplayName(leadData.contact_first_name, leadData.contact_last_name) : "You",
            message: msg.content || msg.body || "",
            subject: msg.subject || "",
            timestamp: msg.last_update || msg.created_at || "",
            isIncoming: msg.direction !== "Outbound",
            event_name: msg.event_name as "delivered" | "processed" | "bounce" | undefined,
            channel: "email" as const,
            author: msg.direction === "Inbound" ? getDisplayName(leadData.contact_first_name, leadData.contact_last_name) : "You",
            status: (msg.status != null
              ? (String(msg.status).toLowerCase() as Message["status"])
              : undefined),
            open_count: Number(msg.open_count ?? 0),
            click_count: Number(msg.clicks_count ?? msg.click_count ?? 0),
          }))

        // Twilio messages
        let twilioMessages: CombinedMessage[] = []
        try {
          // Load SMS messages
          if (conversation?.twilio_conv_id) {
            try {
              const res = await fetch(`/api/twilio/conversation/${conversation.twilio_conv_id}`)
              const data = await res.json()
              const smsMessages = (data.messages || []).map((msg: any) => ({
                id: msg.id,
                sender: msg.author === "system" ? "system" : (msg.author || getDisplayName(leadData.contact_first_name, leadData.contact_last_name)),
                message: msg.body,
                subject: "",
                timestamp: msg.dateCreated,
                isIncoming: msg.author !== "system" && msg.author !== "whatsapp:+447307208994" && msg.author !== "whatsapp:+447367835651" && msg.author !== "whatsapp:+447360543337" && msg.author !== "+447367835651" && msg.author !== "+447360543337",
                event_name: undefined,
                channelType: "sms",
                delivered: msg.delivered,
                seen: msg.seen,
                channel: "sms" as Channel,
                author: msg.author,
                delivery: {
                  read: msg.delivery?.read || "none",
                  delivered: msg.delivery?.delivered || "none",
                },
                media: msg.media,
              }));
              twilioMessages = [...twilioMessages, ...smsMessages];
            } catch (err) {
              console.error("Error loading SMS messages:", err);
            }
          }

          // Load WhatsApp messages from database (replaced Twilio API call)
          try {
            if (dbWhatsAppMessages && dbWhatsAppMessages.length > 0) {
              const ourNumbers = {
                whatsapp: "whatsapp:+447307208994",
                whatsappOld: "whatsapp:+447367835651",
                sms: "+447367835651",
                system: "system"
              };
              
              const whatsappMessages = dbWhatsAppMessages.map((msg: any) => {
                const isInbound = msg.is_inbound === true;
                let sender = "";
                let author = "";
                
                if (isInbound) {
                  sender = getDisplayName(leadData.contact_first_name || "", leadData.contact_last_name || "") || "Lead";
                  author = `lead-${leadData.id}`;
                } else {
                  sender = "You";
                  author = ourNumbers.whatsapp;
                }
                
                return {
                id: msg.id,
                  sender: sender,
                  message: msg.message_text || "",
                subject: "",
                  timestamp: msg.sent_at || msg.created_at || new Date().toISOString(),
                  isIncoming: isInbound,
                event_name: undefined,
                  channelType: "whatsapp" as "whatsapp",
                channel: "whatsapp" as Channel,
                  author: author,
                delivery: {
                    read: ((msg.message_status === "read" || msg.message_status === "delivered") ? "all" : "none") as "all" | "none",
                    delivered: ((msg.message_status === "delivered" || msg.message_status === "sent") ? "all" : "none") as "all" | "none",
                },
                  media: undefined,
                };
              });
              
              twilioMessages = [...twilioMessages, ...whatsappMessages];
            }
          } catch (err) {
            console.error("❌ Error loading WhatsApp messages from database:", err);
          }
        } catch (err) {
          console.error("Error in message loading:", err);
          twilioMessages = [];
        }

        // Combine messages, remove duplicates, and sort
        const messageMap = new Map<string | number, CombinedMessage>();
        
        // Add email messages to the map
        emailMessages.forEach(msg => {
          messageMap.set(msg.id, msg);
        });
        
        // Add Twilio messages to the map
        twilioMessages.forEach(msg => {
          messageMap.set(msg.id, msg);
        });
        
        // Convert back to array and sort by timestamp
        const allMessages = Array.from(messageMap.values()).sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        // Create combined timeline with messages and calls
        const callsArray = (callsData as unknown as Call[]) || [];
        const combinedTimeline = [
          ...allMessages.map(msg => ({ type: 'message' as const, data: msg, timestamp: msg.timestamp })),
          ...callsArray.map(call => ({ type: 'call' as const, data: call, timestamp: call.created_at }))
        ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        setThread(allMessages);
        setCombinedTimeline(combinedTimeline);

        // Set last used channel
        if (allMessages.length > 0 && leadData) {
          const lastMsg = [...allMessages].reverse().find((m) => m.channel)
          if (leadData && lastMsg) {
            setLastUsedChannel(lastMsg.channel as Channel || "email")
          }
        }
      } catch (error) {
        console.error("Error loading lead or messages:", error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        setLoadError(`Failed to load conversation data: ${errorMessage}`)
        // Set empty thread on error to prevent UI from hanging
        setThread([])
        setCombinedTimeline([])
      } finally {
        setLoading(false)
      }
    }
    
    if (leadId) {
      loadLead()
    }
  }, [leadId])

  // Fetch current user's phone number
  useEffect(() => {
    async function fetchUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: userData, error } = await supabase
            .from("users")
            .select("phone_number")
            .eq("user_id", user.id)
            .single();
          
          if (error) {
            console.error("Error fetching user data:", error);
          } else if (userData?.phone_number) {
            setUserPhoneNumber(userData.phone_number);
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    }
    fetchUserData();
  }, []);

  const handleSendMessage = async () => {
    if (!lead || !message.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a message to send.",
        variant: "destructive",
      });
      return;
    }

    // Check contact availability before sending
    if (lastUsedChannel === "email" && !lead?.contact_email && !lead?.company_email) {
      toast({
        title: "No Contact Email",
        description: "This lead does not have a contact email address. Please add a contact email or use a different communication method.",
        variant: "destructive",
      });
      return;
    }
    
    if ((lastUsedChannel === "sms" || lastUsedChannel === "whatsapp") && !lead?.mobile_phone && !lead?.business_telephone) {
      toast({
        title: "No Contact Phone",
        description: "This lead does not have a contact phone number. Please add a mobile phone or business telephone or use email instead.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    
    // Check WhatsApp policy before sending
    if (lastUsedChannel === "whatsapp" && !whatsappPolicy.allowed) {
      toast({
        title: "WhatsApp Policy Violation",
        description: `Cannot send WhatsApp message: ${whatsappPolicy.reason}. Please use email or SMS instead.`,
        variant: "destructive",
      });
      setIsSending(false);
      return;
    }
    
    try {
      if (lastUsedChannel === "email") {
        if (!subject.trim()) {
          toast({
            title: "Missing subject",
            description: "Please enter an email subject.",
            variant: "destructive",
          });
          setIsSending(false);
          return;
        }

        // Prepare email content with signature if checked
        let emailContent = message;
        if (includeSignature && userPhoneNumber) {
          emailContent += generateSignature(userPhoneNumber);
        }

        const newMessage: CombinedMessage = {
          id: `temp-${Date.now()}`,
          sender: "You",
          message: emailContent,
          subject: subject,
          timestamp: new Date().toISOString(),
          isIncoming: false,
          channel: "email",
        };
        setThread((prev) => [...prev, newMessage]);
        
        const response = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: lead.contact_email || lead.company_email,
            subject: subject,
            content: emailContent,
            leadId: leadId,
            conversationId: activeConversation?.id,
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to send email");
        }
        
        setMessage("");
        setSubject("");
        toast({ title: "Email sent", description: "Your message has been sent successfully." });
        
        // Reload the page after successful email sending
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else if ((lastUsedChannel === "whatsapp" || lastUsedChannel === "sms") && (activeConversation?.twilio_conv_id || activeConversation?.whatsapp_twilio_conv_id)) {
        const tempId = `temp-${Date.now()}`;
        const newMessage: CombinedMessage = {
          id: tempId,
          sender: "You",
          message: message,
          subject: "",
          timestamp: new Date().toISOString(),
          isIncoming: false,
          channel: lastUsedChannel,
          delivery: { delivered: "none", read: "none" },
        };
        setThread((prev) => [...prev, newMessage]);
        
        // Determine the correct 'to' number for SMS/WhatsApp
        let to = "";
        if (lead) {
          if (lastUsedChannel === "sms") {
            to = lead.mobile_phone || lead.business_telephone || "";
          } else if (lastUsedChannel === "whatsapp") {
            const raw = lead.mobile_phone || lead.business_telephone || "";
            to = raw.startsWith("whatsapp:") ? raw : `whatsapp:${raw}`;
          }
        }
        
        // Determine the correct conversation ID based on channel
        const conversationId = lastUsedChannel === "whatsapp"
          ? activeConversation.whatsapp_twilio_conv_id
          : activeConversation.twilio_conv_id;

        if (!conversationId) {
          throw new Error(`No conversation ID found for ${lastUsedChannel}`);
        }

        const response = await fetch(`/api/twilio/conversation/${conversationId}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: message,
            channel: lastUsedChannel,
            leadId: lead?.id || "",
            to,
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Failed to send ${lastUsedChannel} message`);
        }
        
        setMessage("");
        toast({ title: `${lastUsedChannel.charAt(0).toUpperCase() + lastUsedChannel.slice(1)} sent`, description: `Your ${lastUsedChannel} message has been sent.` });
        
        // Reload the page after successful message sending
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error(`Error sending ${lastUsedChannel} message:`, error);
      toast({
        title: `Failed to send ${lastUsedChannel}`,
        description: error instanceof Error ? error.message : `An error occurred while sending the ${lastUsedChannel} message`,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!notes.trim()) {
      toast({
        title: "Empty notes",
        description: "Please enter some notes before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingNotes(true);
    try {
      // Here you would save notes to your database
      // For now, we'll just show a success message
      toast({
        title: "Notes saved",
        description: "Your notes have been saved successfully.",
      });
      setShowNotesDialog(false);
      setNotes("");
    } catch (error) {
      console.error("Error saving notes:", error);
      toast({
        title: "Failed to save notes",
        description: "An error occurred while saving your notes.",
        variant: "destructive",
      });
    } finally {
      setIsSavingNotes(false);
    }
  };


  // Function to send Twilio template
  const handleSendTwilioTemplate = async () => {
    if (!selectedTwilioTemplate || !lead?.id) {
      toast({
        title: "Missing information",
        description: "Please select a template and ensure lead information is available.",
        variant: "destructive",
      });
      return;
    }

    // Check if lead has a phone number for SMS templates
    if (!lead?.mobile_phone && !lead?.business_telephone) {
      toast({
        title: "No Contact Phone",
        description: "This lead does not have a contact phone number. Please add a mobile phone or business telephone to send SMS templates.",
        variant: "destructive",
      });
      return;
    }

    // Disable WhatsApp templates as they are not validated
    if (selectedTwilioTemplate.channels.includes("whatsapp")) {
      toast({
        title: "WhatsApp Templates Disabled",
        description: "WhatsApp templates are not validated and cannot be sent. Please use SMS templates instead.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      // Only use SMS for templates (WhatsApp disabled)
      const templateChannel = "sms";
      
      // Determine the correct 'to' number (SMS only)
      let to = "";
      if (lead) {
        to = lead.mobile_phone || lead.business_telephone || "";
      }

      // For business-initiated templates, we don't need a conversation ID
      // We can send directly using the template SID (SMS only)
      let conversationId = activeConversation?.twilio_conv_id;

      // Replace [First Name] with actual first name
      const personalizedContent = selectedTwilioTemplate.content.replace(
        /\[First Name\]/g, 
        lead.contact_first_name || "there"
      );

      // If no conversation ID, we'll send directly via Twilio Messages API
      const apiUrl = conversationId 
        ? `/api/twilio/conversation/${conversationId}/send`
        : `/api/twilio/send-template`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: personalizedContent,
          channel: templateChannel,
          contactId: lead?.id || "",
          to,
          templateSid: selectedTwilioTemplate.sid,
          conversationId: conversationId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to send ${templateChannel} template`);
      }

      // Add the message to the thread immediately
      const newMessage: CombinedMessage = {
        id: `temp-${Date.now()}`,
        sender: "You",
        message: personalizedContent,
        subject: "",
        timestamp: new Date().toISOString(),
        isIncoming: false,
        channel: templateChannel,
        delivery: { delivered: "none", read: "none" },
      };
      setThread((prev) => [...prev, newMessage]);

      toast({ 
        title: "Template sent successfully", 
        description: `${selectedTwilioTemplate.name} has been sent via ${templateChannel}.` 
      });

      setShowTwilioTemplateDialog(false);
      setSelectedTwilioTemplateId("");
    } catch (error) {
      console.error("Error sending Twilio template:", error);
      toast({
        title: "Failed to send template",
        description: error instanceof Error ? error.message : "An error occurred while sending the template",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-600">Lead not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col border border-gray-200 rounded-lg bg-white min-h-0">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between bg-gray-50 flex-shrink-0 rounded-t-lg">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={clientAvatar} alt={getDisplayName(lead.contact_first_name, lead.contact_last_name)} />
            <AvatarFallback className="bg-blue-500 text-white font-semibold">
              {getDisplayName(lead.contact_first_name, lead.contact_last_name)
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm">{getDisplayName(lead.contact_first_name, lead.contact_last_name)}</h3>
            <p className="text-xs text-gray-500">Lead Conversation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getChannelColor(lastUsedChannel)}>
            {getChannelIcon(lastUsedChannel)}
            <span className="ml-1 capitalize">{lastUsedChannel}</span>
          </Badge>
          {/* <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotesDialog(true)}
            className="text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Notes
          </Button> */}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <ScrollArea className="h-full w-full">
          <div className="p-4 space-y-4 min-h-full">
            {combinedTimeline.length > 0 ? (
              combinedTimeline.map((item, index) => {
                if (item.type === 'call') {
                  return <CallDisplay key={`call-${item.data.id}`} call={item.data} />
                }
                
                const msg = item.data;
                const ourNumbers = {
                  whatsapp: "whatsapp:+447307208994", // New WhatsApp number
                  whatsappOld: "whatsapp:+447367835651", // Old suspended number (for message history)
                  sms: "+447367835651",
                  system: "system"
                };

                let isMine = false;
                if (msg.channel === "email") {
                  isMine = !msg.isIncoming;
                } else if (msg.channel === "sms" || msg.channel === "whatsapp") {
                  const normalizedSender = (msg.sender || '').toLowerCase();
                  const normalizedAuthor = (msg.author || '').toLowerCase();
                  isMine = (
                    normalizedSender === ourNumbers.system ||
                    normalizedSender === ourNumbers.whatsapp.toLowerCase() ||
                    normalizedSender === ourNumbers.whatsappOld.toLowerCase() ||
                    normalizedSender === ourNumbers.sms.toLowerCase() ||
                    normalizedSender === 'you' ||
                    msg.author === ourNumbers.system ||
                    normalizedAuthor === 'whatsapp:+447307208994' ||
                    normalizedAuthor === 'whatsapp:+447367835651' ||
                    normalizedAuthor === 'whatsapp:+447360543337' ||
                    normalizedAuthor === '+447367835651' ||
                    normalizedAuthor === '+447360543337'
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3 w-full max-w-full",
                      isMine ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isMine && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={clientAvatar} alt={getDisplayName(lead.contact_first_name, lead.contact_last_name)} />
                        <AvatarFallback className="bg-blue-500 text-white font-semibold">
                          {getDisplayName(lead.contact_first_name, lead.contact_last_name)
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "flex flex-col min-w-0 max-w-[75%]",
                        isMine ? "items-end text-right" : "items-start text-left"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{msg.sender}</span>
                        <Badge variant="outline" className={cn("text-xs flex-shrink-0", getChannelColor(msg.channel))}>
                          {getChannelIcon(msg.channel)}
                        </Badge>
                      </div>
                      <div className={cn("flex flex-col w-full")}>
                        <Card
                          className={cn(
                            "p-3 w-full overflow-hidden break-words",
                            isMine
                              ? "bg-blue-500 text-white rounded-br-none"
                              : "bg-white rounded-bl-none border shadow-sm"
                          )}
                        >
                          {msg.channel === "email" && msg.subject && (
                            <div className="font-semibold text-xs mb-2 truncate">Subject: {msg.subject}</div>
                          )}
                          {msg.channel === "email" ? (
                            <div className="max-h-48 overflow-y-auto">
                              <div
                                className="text-sm leading-relaxed break-words"
                                dangerouslySetInnerHTML={{ 
                                  __html: msg.message
                                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                                    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                                }}
                                style={{
                                  wordBreak: 'break-word',
                                  overflowWrap: 'break-word',
                                  maxWidth: '100%',
                                  display: 'block',
                                  width: '100%'
                                }}
                              />
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {msg.message && (
                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                  {msg.message}
                                </p>
                              )}
                              {msg.media && msg.media.length > 0 && (
                                <div className="space-y-2">
                                  {msg.media.map((mediaItem: any, idx: number) => (
                                    <MediaDisplay 
                                      key={mediaItem.sid || `media-${idx}`} 
                                      media={mediaItem} 
                                      messageSid={String(msg.id)} 
                                      conversationSid={String(activeConversation?.twilio_conv_id)} 
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                        {isMine && (msg.channel === "whatsapp" || msg.channel === "sms") && (
                          <div className="flex items-center gap-1 mt-1 pr-1">
                            <span className="text-xs text-muted-foreground">{formatMessageTimestamp(msg.timestamp)}</span>
                            {(msg.delivery?.read === "all" || msg.delivery?.read === "some") ? (
                              <>
                                <Check className="w-4 h-4 text-blue-600 font-bold -mr-1" strokeWidth={3} />
                                <Check className="w-4 h-4 text-blue-600 font-bold" strokeWidth={3} />
                              </>
                            ) : (msg.delivery?.delivered === "all" || msg.delivery?.delivered === "some") ? (
                              <>
                                <Check className="w-4 h-4 text-gray-400 font-bold -mr-1" strokeWidth={3} />
                                <Check className="w-4 h-4 text-gray-400 font-bold" strokeWidth={3} />
                              </>
                            ) : (
                              <Check className="w-3 h-3 text-gray-400 font-bold" />
                            )}
                          </div>
                        )}
                        {isMine && msg.channel === "email" && (
                          <div className="flex items-center gap-1 mt-1 pr-1">
                            <span className="text-xs text-muted-foreground">{formatMessageTimestamp(msg.timestamp)}</span>
                            {msg.status === "not_delivered" ? (
                              <div className="flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-red-500" />
                                <span className="text-xs text-red-500">Not Delivered</span>
                              </div>
                            ) : msg.status === "bounce" || msg.event_name === "bounce" ? (
                              <div className="flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-red-500" />
                                <span className="text-xs text-red-500">Bounced</span>
                              </div>
                            ) : msg.status === "delivered" ? (
                              <div className="flex items-center gap-1">
                                <Check className="w-3 h-3 text-green-500" />
                                <span className="text-xs text-green-600">Delivered</span>
                              </div>
                            ) : msg.status === "open" ? (
                              <div className="flex items-center gap-1">
                                <Check className="w-3 h-3 text-blue-500" />
                                <span className="text-xs text-blue-600">Opened</span>
                              </div>
                            ) : msg.status === "error" ? (
                              <div className="flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-red-500" />
                                <span className="text-xs text-red-500">Failed</span>
                              </div>
                            ) : msg.status === "processed" ? (
                              <div className="flex items-center gap-1">
                                <Check className="w-3 h-3 text-amber-500" />
                                <span className="text-xs text-amber-700">Processing</span>
                              </div>
                            ) : msg.status === "sent" ? (
                              <div className="flex items-center gap-1">
                                <Check className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-600">Sent</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Check className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">Pending</span>
                              </div>
                            )}
                            {/* Email Engagement Tracking */}
                            {msg.open_count > 0 && (
                              <div className="flex items-center gap-1 ml-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full" title="Email opened"></div>
                                <span className="text-xs text-green-600">
                                  Opened {msg.open_count} time{msg.open_count > 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                            {msg.click_count > 0 && (
                              <div className="flex items-center gap-1 ml-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full" title="Email clicked"></div>
                                <span className="text-xs text-blue-600">
                                  Clicked {msg.click_count} time{msg.click_count > 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        {!isMine && (
                          <span className="text-xs text-muted-foreground mt-1">{formatMessageTimestamp(msg.timestamp)}</span>
                        )}
                      </div>
                    </div>
                    {isMine && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={userAvatar} alt="You" />
                        <AvatarFallback className="bg-blue-500 text-white font-semibold">You</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">No messages yet. Start the conversation!</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Message Input */}
      <div className="border-t p-4 bg-gray-50 flex-shrink-0 rounded-b-lg">
        {/* Contact Information Status */}
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-800">Contact Information</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Mail className="h-3 w-3" />
              <span className="text-gray-600">Email:</span>
              <span className={(lead?.contact_email || lead?.company_email) ? "text-green-600 font-medium" : "text-red-600"}>
                {(lead?.contact_email || lead?.company_email) ? "Available" : "Not available"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3" />
              <span className="text-gray-600">Phone:</span>
              <span className={(lead?.mobile_phone || lead?.business_telephone) ? "text-green-600 font-medium" : "text-red-600"}>
                {(lead?.mobile_phone || lead?.business_telephone) ? "Available" : "Not available"}
              </span>
            </div>
          </div>
        </div>

        {/* WhatsApp Policy Warning */}
        {lastUsedChannel === "whatsapp" && !whatsappPolicy.allowed && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  WhatsApp Policy Restriction
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  {whatsappPolicy.reason}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Use Email or SMS to continue the conversation
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
            value={lastUsedChannel}
            onChange={(e) => setLastUsedChannel(e.target.value as Channel)}
            title={
              lastUsedChannel === "whatsapp" && !whatsappPolicy.allowed ? 
              `WhatsApp Policy: ${whatsappPolicy.reason}. Use Email or SMS instead.` : 
                lastUsedChannel === "email" && !lead?.contact_email && !lead?.company_email ?
                  "No contact email available for this lead" :
                (lastUsedChannel === "sms" || lastUsedChannel === "whatsapp") && !lead?.mobile_phone && !lead?.business_telephone ?
                  "No contact phone available for this lead" :
              "Select communication channel"
            }
          >
            <option value="email" disabled={!lead?.contact_email && !lead?.company_email}>
              Email {(!lead?.contact_email && !lead?.company_email) ? '(No email available)' : ''}
            </option>
            <option value="whatsapp" disabled={!whatsappPolicy.allowed || (!lead?.mobile_phone && !lead?.business_telephone)}>
              WhatsApp {!whatsappPolicy.allowed ? '(Restricted)' : (!lead?.mobile_phone && !lead?.business_telephone) ? '(No contact phone)' : ''}
            </option>
            <option value="sms" disabled={!lead?.mobile_phone && !lead?.business_telephone}>
              SMS {(!lead?.mobile_phone && !lead?.business_telephone) ? '(No contact phone)' : ''}
            </option>
          </select>
        </div>
        {lastUsedChannel === "email" && (
          <>
            <Input
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mb-3 text-sm"
            />
            {/* Email Signature Checkbox */}
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2">
              <input
                type="checkbox"
                id="includeSignature"
                checked={includeSignature}
                onChange={(e) => setIncludeSignature(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="includeSignature" className="text-sm font-medium cursor-pointer text-blue-900">
                ✍️ Include email signature with my phone number
              </label>
            </div>
          </>
        )}
        <div className="flex gap-3">
          <Textarea
            ref={textareaRef}
            placeholder={`Type your ${lastUsedChannel} message here...`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 min-h-[80px] text-sm resize-none"
          />
          <div className="flex flex-col gap-2">
            {lastUsedChannel === "email" && (
            <Button
              variant="outline"
              size="sm"
                onClick={() => setShowEmailTemplateDialog(true)}
              className="px-3"
                title="Select email template"
            >
                <FileText className="h-4 w-4" />
            </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTwilioTemplateDialog(true)}
              className="px-3"
              title="Send business-initiated template (SMS only - WhatsApp templates not validated)"
              disabled={lastUsedChannel === "whatsapp" || (!lead?.mobile_phone && !lead?.business_telephone)}
            >
              <MessageSquareText className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={
                isSending || 
                !message.trim() || 
                (lastUsedChannel === "email" && !subject.trim()) ||
                (lastUsedChannel === "email" && !lead?.contact_email && !lead?.company_email) ||
                ((lastUsedChannel === "sms" || lastUsedChannel === "whatsapp") && !lead?.mobile_phone && !lead?.business_telephone)
              }
              className="px-3"
              size="sm"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter your notes here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[200px]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleSaveNotes}
              disabled={isSavingNotes || !notes.trim()}
            >
              {isSavingNotes ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Save Notes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Twilio Template Selection Dialog */}
      <Dialog open={showTwilioTemplateDialog} onOpenChange={setShowTwilioTemplateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Template Message</DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              These are business-initiated templates that can be sent outside the 24-hour window.
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="template-type" className="text-sm font-medium">Select Template</label>
              <select
                id="template-type"
                className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-purple-200"
                value={selectedTwilioTemplateId}
                onChange={(e) => setSelectedTwilioTemplateId(e.target.value)}
              >
                <option value="">-- Choose a template --</option>
                {TWILIO_TEMPLATES.filter(template => template.channels.includes("sms")).map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} (SMS Only)
                  </option>
                ))}
              </select>
            </div>
            
            {selectedTwilioTemplate && (
              <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                <h4 className="font-semibold text-purple-800 mb-2">Preview:</h4>
                <div className="bg-white border rounded-md p-3 text-sm">
                  <p className="text-gray-800">
                    {selectedTwilioTemplate.content.replace(
                      /\[First Name\]/g, 
                      lead?.contact_first_name || "there"
                    )}
                  </p>
                </div>
                <div className="mt-2 text-xs text-purple-600">
                  <p><strong>Template ID:</strong> {selectedTwilioTemplate.sid}</p>
                  <p><strong>Channels:</strong> {selectedTwilioTemplate.channels.join(", ")}</p>
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Channel:</strong> SMS Only
              </p>
              <p className="text-sm text-blue-700 mt-1">
                The template will be sent via SMS to {getDisplayName(lead?.contact_first_name || "", lead?.contact_last_name || "")}.
              </p>
              <p className="text-sm text-green-700 mt-2 font-medium">
                ✅ Business-initiated template - works outside 24-hour window
              </p>
              <p className="text-xs text-green-600 mt-1">
                No existing conversation required - sends directly via template
              </p>
              <p className="text-xs text-amber-600 mt-2 font-medium">
                ⚠️ WhatsApp templates are disabled (not validated)
              </p>
            </div>
          </div>
          
          <div className="flex justify-end mt-6 gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleSendTwilioTemplate}
              disabled={isSending || !selectedTwilioTemplateId}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageSquareText className="mr-2 h-4 w-4" />
                  Send Template
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Template Selection Dialog */}
      <Dialog open={showEmailTemplateDialog} onOpenChange={setShowEmailTemplateDialog}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>Select Email Template</DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              Choose a template to use for your email
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-template-type" className="text-sm font-medium">Select Template</label>
              <select
                id="email-template-type"
                className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                <option value="">Choose a template...</option>
                {EMAIL_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Variable Editing Section */}
            {selectedTemplate && Object.keys(templateVariables).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800">Edit Variables</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(templateVariables).map(([varName, varValue]) => (
                    <div key={varName}>
                      <label htmlFor={`var-${varName}`} className="text-sm font-medium text-gray-700">
                        {varName}
                      </label>
                      <input
                        id={`var-${varName}`}
                        type="text"
                        className="w-full border rounded-md px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        value={varValue}
                        onChange={(e) => setTemplateVariables(prev => ({
                          ...prev,
                          [varName]: e.target.value
                        }))}
                        placeholder={`Enter ${varName.toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {selectedTemplate && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Preview:</h4>
                <div className="bg-white border rounded-md p-3 text-sm">
                  <p className="text-gray-800 font-medium mb-2">
                    Subject: {replaceTemplateVariables(selectedTemplate.subject, templateVariables)}
                  </p>
                  <div className="border rounded-md overflow-hidden max-h-64 overflow-y-auto">
                    <iframe
                      srcDoc={replaceTemplateVariables(selectedTemplate.html, templateVariables)}
                      className="w-full h-64 border-0"
                      title="Email Preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
                <div className="mt-2 text-xs text-blue-600">
                  <p><strong>Variables found:</strong> {selectedTemplate.html.match(/\{\{([^}]+)\}\}/g)?.join(', ') || 'None'}</p>
                  <p><strong>Available data:</strong> {lead ? `${lead.contact_first_name || 'No first name'}, ${(lead as any).business_name || 'No business name'}` : 'No lead data'}</p>
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This will replace your current message and subject with the template content.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => {
                if (selectedTemplate) {
                  // Replace variables in subject and message using current template variables
                  const personalizedSubject = replaceTemplateVariables(selectedTemplate.subject, templateVariables)
                  const personalizedMessage = replaceTemplateVariables(selectedTemplate.html, templateVariables)
                  
                  setSubject(personalizedSubject)
                  setMessage(personalizedMessage)
                  setShowEmailTemplateDialog(false)
                }
              }}
              disabled={!selectedTemplateId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FileText className="mr-2 h-4 w-4" />
              Use Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
