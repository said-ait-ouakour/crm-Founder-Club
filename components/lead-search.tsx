"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, ChevronsUpDown, Loader2, X, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone_number?: string
  owner?: string
}

interface LeadSearchProps {
  leads?: Lead[] // Made optional for backward compatibility
  selectedLead: Lead | null
  onSelectLead: (lead: Lead | null) => void
  placeholder?: string
  className?: string
  useApiSearch?: boolean // New prop to enable API-based search
  allowManualInput?: boolean // New prop to allow manual lead creation
  onManualInput?: (leadData: { first_name: string; last_name: string; email: string; phone_number?: string }) => void
}

export function LeadSearch({ 
  leads = [], 
  selectedLead, 
  onSelectLead, 
  placeholder = "Search leads...",
  className,
  useApiSearch = true, // Default to API search
  allowManualInput = false,
  onManualInput
}: LeadSearchProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<Lead[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualInputData, setManualInputData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: ''
  })
  const [isCreatingLead, setIsCreatingLead] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // API-based search function
  const searchLeads = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    setSearchError(null)

    try {
      const response = await fetch(`/api/leads/search?q=${encodeURIComponent(query)}&limit=50`)
      if (!response.ok) {
        throw new Error('Failed to search leads')
      }
      
      const data = await response.json()
      setSearchResults(data.leads || [])
    } catch (error) {
      console.error('Error searching leads:', error)
      setSearchError('Failed to search leads')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (useApiSearch && searchTerm.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchLeads(searchTerm)
      }, 200) // Reduced debounce for better responsiveness
    } else if (useApiSearch && searchTerm.trim().length === 0) {
      // Clear results immediately when search is empty
      setSearchResults([])
      setSearchError(null)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm, searchLeads, useApiSearch])

  // Client-side filtering for backward compatibility
  const filteredLeads = useCallback(() => {
    if (useApiSearch) {
      return searchResults
    }
    
    if (!searchTerm.trim()) return leads
    const term = searchTerm.toLowerCase()
    return leads.filter(lead => 
      `${lead.contact_first_name} ${lead.contact_last_name} ${lead.contact_email}`.toLowerCase().includes(term)
    )
  }, [searchTerm, leads, useApiSearch, searchResults])

  // Handle lead selection
  const handleSelect = useCallback((lead: Lead) => {
    onSelectLead(lead)
    setSearchTerm('')
    setSearchResults([])
    setSearchError(null)
    setOpen(false)
  }, [onSelectLead])

  // Handle clearing selection
  const handleClearSelection = useCallback((e: React.MouseEvent) => {
    e.stopPropagation() // Prevent opening the dropdown
    onSelectLead(null)
    setSearchTerm('')
    setSearchResults([])
    setSearchError(null)
    setShowManualInput(false)
    setManualInputData({ first_name: '', last_name: '', email: '', phone_number: '' })
  }, [onSelectLead])

  // Handle manual input toggle
  const handleToggleManualInput = useCallback(() => {
    setShowManualInput(!showManualInput)
    if (!showManualInput) {
      setSearchTerm('')
      setSearchResults([])
      setSearchError(null)
      setOpen(true) // Open the dropdown when showing manual input
    }
  }, [showManualInput])

  // Handle manual input data change
  const handleManualInputChange = useCallback((field: string, value: string) => {
    setManualInputData(prev => ({
      ...prev,
      [field]: value
    }))
  }, [])

  // Handle creating new lead
  const handleCreateLead = useCallback(async () => {
    if (!manualInputData.first_name || !manualInputData.last_name || !manualInputData.email) {
      setSearchError('Please fill in all required fields (First Name, Last Name, Email)')
      return
    }

    console.log('Creating lead with data:', manualInputData)
    setIsCreatingLead(true)
    setSearchError(null)

    try {
      // Convert form data to Lead format - using same logic as create-lead-card.tsx
      const leadData = {
        first_name: manualInputData.first_name.trim(),
        last_name: manualInputData.last_name.trim(),
        email: manualInputData.email.trim().toLowerCase(),
        phone_number: manualInputData.phone_number?.trim() || null,
        current_status: "Open", // Default status
        lead_source: "Manual Entry", // Set lead source for manual entry
        created_on: new Date().toISOString(),
        // Add required fields that might be missing
        verified_phone: true,
        verified_email: true,
      };

      console.log('Prepared lead data for insertion:', leadData);
      
      const { data, error } = await supabase
        .from('leads')
        .insert([leadData])
        .select('id, first_name, last_name, email, phone_number')
        .single()

      if (error) {
        console.error('Error creating lead:', error)
        setSearchError('Failed to create lead: ' + error.message)
        return
      }

      console.log('Lead created successfully:', data)
      
      // Convert to the expected format
      const newLead = {
        id: String(data.id),
        first_name: String(data.first_name),
        last_name: String(data.last_name),
        email: String(data.email),
        phone_number: data.phone_number ? String(data.phone_number) : undefined
      }

      onSelectLead(newLead)
      setShowManualInput(false)
      setOpen(false)
      
    } catch (error) {
      console.error('Error creating lead:', error)
      setSearchError('Failed to create lead')
    } finally {
      setIsCreatingLead(false)
    }
  }, [manualInputData, onSelectLead])

  // Clear search when popover closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchTerm('')
      setSearchResults([])
      setSearchError(null)
      setShowManualInput(false) // Close manual input when dropdown closes
    }
  }, [])

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={popoverRef} className={className}>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between"
              onClick={() => setOpen(true)}
            >
              {selectedLead ? (
                <div className="flex items-center justify-between w-full pr-2">
                  <span className="truncate flex-1">
                    {selectedLead.first_name} {selectedLead.last_name} ({selectedLead.email})
                  </span>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100 transition-opacity rounded-sm hover:bg-gray-200 p-0.5"
                    aria-label="Clear selection"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <span className="text-muted-foreground">Select a lead...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          
          <PopoverContent className="w-[500px] p-0" align="start">
            {showManualInput ? (
              <div 
                className="p-6"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Create New Lead</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleManualInput}
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="first_name" className="text-sm font-medium">First Name *</Label>
                    <Input
                      id="first_name"
                      value={manualInputData.first_name}
                      onChange={(e) => handleManualInputChange('first_name', e.target.value)}
                      placeholder="Enter first name"
                      className="h-10 mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="last_name" className="text-sm font-medium">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={manualInputData.last_name}
                      onChange={(e) => handleManualInputChange('last_name', e.target.value)}
                      placeholder="Enter last name"
                      className="h-10 mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={manualInputData.email}
                      onChange={(e) => handleManualInputChange('email', e.target.value)}
                      placeholder="Enter email address"
                      className="h-10 mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone_number" className="text-sm font-medium">Phone Number</Label>
                    <Input
                      id="phone_number"
                      value={manualInputData.phone_number}
                      onChange={(e) => handleManualInputChange('phone_number', e.target.value)}
                      placeholder="Enter phone number (optional)"
                      className="h-10 mt-1"
                    />
                  </div>
                  
                  {searchError && (
                    <div className="text-sm text-red-500">{searchError}</div>
                  )}
                  
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleCreateLead}
                      disabled={isCreatingLead || !manualInputData.first_name || !manualInputData.last_name || !manualInputData.email}
                      size="default"
                      className="flex-1 h-10"
                    >
                      {isCreatingLead ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Creating...
                        </>
                      ) : (
                        'Create Lead'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleToggleManualInput}
                      size="default"
                      className="h-10"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Command shouldFilter={false} className="overflow-visible">
                <CommandInput 
                  placeholder={useApiSearch ? "Type to search all leads..." : placeholder}
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                  className="h-9"
                />
                <CommandList>
                  {isSearching && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Searching...</span>
                    </div>
                  )}
                  
                  {searchError && (
                    <div className="flex items-center justify-center py-6">
                      <span className="text-sm text-red-500">{searchError}</span>
                    </div>
                  )}
                  
                  {!isSearching && !searchError && (
                    <>
                      <CommandEmpty>
                        {useApiSearch 
                          ? (searchTerm.length < 2 ? "Type at least 2 characters to search..." : "No leads found.")
                          : "No leads found."
                        }
                      </CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-y-auto">
                        {filteredLeads().map((lead) => {
                          const isSelected = selectedLead?.id === lead.id
                          return (
                            <CommandItem
                              key={lead.id}
                              value={`${lead.contact_first_name} ${lead.contact_last_name} ${lead.contact_email}`}
                              onSelect={() => handleSelect(lead)}
                              className={cn("cursor-pointer", isSelected ? "bg-accent" : "")}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 min-w-4",
                                  isSelected ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {lead.contact_first_name} {lead.contact_last_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {lead.contact_email}
                                </span>
                              </div>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            )}
          </PopoverContent>
        </Popover>
        
        {allowManualInput && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleToggleManualInput()
            }}
            onMouseDown={(e) => {
              e.preventDefault()
            }}
            className="px-3"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Create New Lead
          </Button>
        )}
      </div>
    </div>
  )
}
