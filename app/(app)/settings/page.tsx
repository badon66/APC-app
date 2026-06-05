'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import type { BadgeColor } from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import { BUSINESS_ID } from '@/lib/config'

// ─── Types ────────────────────────────────────────────────────────────────────

type BusinessForm = {
  name: string
  phone: string
  email: string
  website: string
  address: string
}

type ServiceRate = {
  id: string
  business_id: string
  service_name: string
  unit: string
  category: string
  rate_low: number
  rate_mid: number
  rate_high: number
  active: boolean | null
  sort_order: number | null
}

type ServiceForm = {
  service_name: string
  unit: string
  category: string
  rate_low: string
  rate_mid: string
  rate_high: string
  active: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const UNIT_OPTIONS = [
  { value: 'ft²', label: 'ft² (Square Feet)' },
  { value: 'ft', label: 'ft (Linear Feet)' },
  { value: 'lbs', label: 'lbs (Pounds)' },
]

const CATEGORY_OPTIONS = [
  { value: 'asphalt', label: 'Asphalt' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'both', label: 'Both' },
]

const CATEGORY_BADGES: Record<string, { label: string; color: BadgeColor }> = {
  asphalt: { label: 'Asphalt', color: 'amber' },
  concrete: { label: 'Concrete', color: 'blue' },
  both: { label: 'Both', color: 'gray' },
}

const EMPTY_SERVICE_FORM: ServiceForm = {
  service_name: '',
  unit: 'ft²',
  category: 'asphalt',
  rate_low: '',
  rate_mid: '',
  rate_high: '',
  active: true,
}

// ─── Toggle component ─────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      aria-label={checked ? 'Active — tap to deactivate' : 'Inactive — tap to activate'}
      className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-accent' : 'bg-white/20'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  // Business info
  const [bizForm, setBizForm] = useState<BusinessForm>({
    name: '', phone: '', email: '', website: '', address: '',
  })
  const [bizLoading, setBizLoading] = useState(true)
  const [bizSaving, setBizSaving] = useState(false)
  const [bizMsg, setBizMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Service rates list
  const [services, setServices] = useState<ServiceRate[]>([])
  const [svcLoading, setSvcLoading] = useState(true)

  // Edit modal
  const [editSvc, setEditSvc] = useState<ServiceRate | null>(null)
  const [editForm, setEditForm] = useState<ServiceForm>(EMPTY_SERVICE_FORM)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)

  // Add modal
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<ServiceForm>(EMPTY_SERVICE_FORM)
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // ─── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    loadBusiness()
    loadServices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadBusiness() {
    setBizLoading(true)
    const { data } = await supabase
      .from('businesses')
      .select('name, phone, email, website, address')
      .eq('id', BUSINESS_ID)
      .single()
    if (data) {
      setBizForm({
        name: data.name ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        website: data.website ?? '',
        address: data.address ?? '',
      })
    }
    setBizLoading(false)
  }

  async function loadServices(silent = false) {
    if (!silent) setSvcLoading(true)
    const { data } = await supabase
      .from('service_rates')
      .select('*')
      .eq('business_id', BUSINESS_ID)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('service_name', { ascending: true })
    setServices(data ?? [])
    if (!silent) setSvcLoading(false)
  }

  // ─── Business handlers ──────────────────────────────────────────────────────

  async function saveBusiness() {
    setBizSaving(true)
    setBizMsg(null)
    const { error } = await supabase
      .from('businesses')
      .update({
        name: bizForm.name,
        phone: bizForm.phone || null,
        email: bizForm.email || null,
        website: bizForm.website || null,
        address: bizForm.address || null,
      })
      .eq('id', BUSINESS_ID)
    setBizSaving(false)
    if (error) {
      setBizMsg({ ok: false, text: 'Failed to save. Please try again.' })
    } else {
      setBizMsg({ ok: true, text: 'Business info saved.' })
      setTimeout(() => setBizMsg(null), 3000)
    }
  }

  // ─── Service rate handlers ──────────────────────────────────────────────────

  function openEditModal(svc: ServiceRate) {
    setEditSvc(svc)
    setEditForm({
      service_name: svc.service_name,
      unit: svc.unit,
      category: svc.category,
      rate_low: String(svc.rate_low),
      rate_mid: String(svc.rate_mid),
      rate_high: String(svc.rate_high),
      active: svc.active !== false,
    })
    setEditError(null)
    setConfirmDel(false)
  }

  async function toggleActive(svc: ServiceRate) {
    const newActive = svc.active === false
    setServices(prev =>
      prev.map(s => (s.id === svc.id ? { ...s, active: newActive } : s))
    )
    await supabase
      .from('service_rates')
      .update({ active: newActive })
      .eq('id', svc.id)
  }

  async function saveEdit() {
    if (!editSvc) return
    setEditSaving(true)
    setEditError(null)
    const { error } = await supabase
      .from('service_rates')
      .update({
        service_name: editForm.service_name.trim(),
        unit: editForm.unit,
        category: editForm.category,
        rate_low: parseFloat(editForm.rate_low) || 0,
        rate_mid: parseFloat(editForm.rate_mid) || 0,
        rate_high: parseFloat(editForm.rate_high) || 0,
        active: editForm.active,
      })
      .eq('id', editSvc.id)
    setEditSaving(false)
    if (error) {
      setEditError('Failed to save. Please try again.')
    } else {
      setEditSvc(null)
      loadServices(true)
    }
  }

  async function doDelete() {
    if (!editSvc) return
    await supabase.from('service_rates').delete().eq('id', editSvc.id)
    setEditSvc(null)
    loadServices(true)
  }

  async function addService() {
    if (!addForm.service_name.trim()) {
      setAddError('Service name is required.')
      return
    }
    setAddSaving(true)
    setAddError(null)
    const { error } = await supabase.from('service_rates').insert({
      business_id: BUSINESS_ID,
      service_name: addForm.service_name.trim(),
      unit: addForm.unit,
      category: addForm.category,
      rate_low: parseFloat(addForm.rate_low) || 0,
      rate_mid: parseFloat(addForm.rate_mid) || 0,
      rate_high: parseFloat(addForm.rate_high) || 0,
      active: true,
    })
    setAddSaving(false)
    if (error) {
      setAddError('Failed to add service. Please try again.')
    } else {
      setShowAdd(false)
      setAddForm(EMPTY_SERVICE_FORM)
      loadServices(true)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-base">
      <PageHeader title="Settings" />

      <div className="p-4 space-y-6 pb-8">

        {/* ── Business Information ── */}
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">
            Business Information
          </h2>
          <Card>
            {bizLoading ? (
              <p className="text-sm text-muted text-center py-6">Loading…</p>
            ) : (
              <div className="space-y-4">
                <Input
                  label="Business Name"
                  value={bizForm.name}
                  onChange={e => setBizForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Alberta Premium Coatings"
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={bizForm.phone}
                  onChange={e => setBizForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="(866) 828-3630"
                />
                <Input
                  label="Email"
                  type="email"
                  value={bizForm.email}
                  onChange={e => setBizForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="info@albertapremiumcoatings.com"
                />
                <Input
                  label="Website"
                  value={bizForm.website}
                  onChange={e => setBizForm(p => ({ ...p, website: e.target.value }))}
                  placeholder="albertapremiumcoatings.com"
                />
                <Input
                  label="Address"
                  value={bizForm.address}
                  onChange={e => setBizForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="123 Main St, Calgary, AB"
                />
                {bizMsg && (
                  <p className={`text-sm ${bizMsg.ok ? 'text-accent' : 'text-danger'}`}>
                    {bizMsg.text}
                  </p>
                )}
                <Button fullWidth onClick={saveBusiness} loading={bizSaving}>
                  Save Business Info
                </Button>
              </div>
            )}
          </Card>
        </section>

        {/* ── Service Rates ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-widest">
              Service Rates
            </h2>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus size={14} />
              Add Service
            </Button>
          </div>

          {svcLoading ? (
            <p className="text-sm text-muted text-center py-8">Loading…</p>
          ) : services.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">
              No services configured yet.
            </p>
          ) : (
            <div className="space-y-2">
              {services.map(svc => {
                const catCfg = CATEGORY_BADGES[svc.category] ?? {
                  label: svc.category,
                  color: 'gray' as BadgeColor,
                }
                const isActive = svc.active !== false
                return (
                  <Card key={svc.id} className={isActive ? '' : 'opacity-50'}>
                    <div className="flex items-start gap-3">
                      {/* Service info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-sm font-semibold text-foreground leading-tight">
                            {svc.service_name}
                          </span>
                          <Badge color={catCfg.color} size="sm">
                            {catCfg.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted mb-2">{svc.unit}</p>
                        <div className="flex gap-4 text-xs">
                          <span className="text-muted">
                            Low{' '}
                            <span className="text-foreground font-medium">
                              ${svc.rate_low}
                            </span>
                          </span>
                          <span className="text-muted">
                            Mid{' '}
                            <span className="text-foreground font-medium">
                              ${svc.rate_mid}
                            </span>
                          </span>
                          <span className="text-muted">
                            High{' '}
                            <span className="text-foreground font-medium">
                              ${svc.rate_high}
                            </span>
                          </span>
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex flex-col items-end gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditModal(svc)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/8 text-muted transition-colors"
                          aria-label="Edit service"
                        >
                          <Pencil size={14} />
                        </button>
                        <Toggle checked={isActive} onChange={() => toggleActive(svc)} />
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Edit Service Modal ── */}
      <Modal
        open={!!editSvc}
        onClose={() => { setEditSvc(null); setConfirmDel(false) }}
        title="Edit Service"
      >
        {editSvc && (
          <div className="space-y-4">
            <Input
              label="Service Name"
              value={editForm.service_name}
              onChange={e => setEditForm(p => ({ ...p, service_name: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Unit"
                options={UNIT_OPTIONS}
                value={editForm.unit}
                onChange={e => setEditForm(p => ({ ...p, unit: e.target.value }))}
              />
              <Select
                label="Category"
                options={CATEGORY_OPTIONS}
                value={editForm.category}
                onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Low"
                type="number"
                step="0.01"
                min="0"
                value={editForm.rate_low}
                onChange={e => setEditForm(p => ({ ...p, rate_low: e.target.value }))}
              />
              <Input
                label="Mid"
                type="number"
                step="0.01"
                min="0"
                value={editForm.rate_mid}
                onChange={e => setEditForm(p => ({ ...p, rate_mid: e.target.value }))}
              />
              <Input
                label="High"
                type="number"
                step="0.01"
                min="0"
                value={editForm.rate_high}
                onChange={e => setEditForm(p => ({ ...p, rate_high: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-medium text-foreground">Active</span>
              <Toggle
                checked={editForm.active}
                onChange={v => setEditForm(p => ({ ...p, active: v }))}
              />
            </div>
            {editError && <p className="text-sm text-danger">{editError}</p>}
            <Button fullWidth onClick={saveEdit} loading={editSaving}>
              Save Changes
            </Button>
            <div className="pt-3 border-t border-white/8">
              {!confirmDel ? (
                <Button
                  fullWidth
                  variant="ghost"
                  className="text-danger hover:bg-danger/10"
                  onClick={() => setConfirmDel(true)}
                >
                  <Trash2 size={14} />
                  Delete Service
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-center text-muted">
                    Remove{' '}
                    <strong className="text-foreground">
                      {editSvc.service_name}
                    </strong>{' '}
                    from your service list?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" onClick={() => setConfirmDel(false)}>
                      Cancel
                    </Button>
                    <Button variant="danger" onClick={doDelete}>
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Add Service Modal ── */}
      <Modal
        open={showAdd}
        onClose={() => {
          setShowAdd(false)
          setAddForm(EMPTY_SERVICE_FORM)
          setAddError(null)
        }}
        title="Add Service"
      >
        <div className="space-y-4">
          <Input
            label="Service Name"
            value={addForm.service_name}
            onChange={e => setAddForm(p => ({ ...p, service_name: e.target.value }))}
            placeholder="e.g. Extra Coat"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Unit"
              options={UNIT_OPTIONS}
              value={addForm.unit}
              onChange={e => setAddForm(p => ({ ...p, unit: e.target.value }))}
            />
            <Select
              label="Category"
              options={CATEGORY_OPTIONS}
              value={addForm.category}
              onChange={e => setAddForm(p => ({ ...p, category: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Low"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={addForm.rate_low}
              onChange={e => setAddForm(p => ({ ...p, rate_low: e.target.value }))}
            />
            <Input
              label="Mid"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={addForm.rate_mid}
              onChange={e => setAddForm(p => ({ ...p, rate_mid: e.target.value }))}
            />
            <Input
              label="High"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={addForm.rate_high}
              onChange={e => setAddForm(p => ({ ...p, rate_high: e.target.value }))}
            />
          </div>
          {addError && <p className="text-sm text-danger">{addError}</p>}
          <Button fullWidth onClick={addService} loading={addSaving}>
            Add Service
          </Button>
        </div>
      </Modal>
    </div>
  )
}
