/**
 * UI Component for Datum, Unit, and Timezone Controls
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Ruler, 
  Clock, 
  Globe,
  Save,
  RotateCcw,
  Check
} from 'lucide-react';

import { tideControlManager, TideControls } from '@/lib/controls';

export function ControlsSettingsPanel() {
  const [settings, setSettings] = useState<TideControls>(tideControlManager.getSettings());
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSettings(tideControlManager.getSettings());
  }, []);

  const handleSettingChange = <K extends keyof TideControls>(key: K, value: TideControls[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setHasChanges(true);
  };

  const saveSettings = () => {
    tideControlManager.updateSettings(settings);
    setShowSaveSuccess(true);
    setHasChanges(false);
    
    setTimeout(() => setShowSaveSuccess(false), 2000);
  };

  const resetSettings = () => {
    tideControlManager.resetToDefaults();
    setSettings(tideControlManager.getSettings());
    setHasChanges(false);
  };

  const exportSettings = () => {
    const settingsJson = tideControlManager.exportSettings();
    const blob = new Blob([settingsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tide-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const settingsJson = e.target?.result as string;
      if (tideControlManager.importSettings(settingsJson)) {
        setSettings(tideControlManager.getSettings());
        setHasChanges(false);
        alert('นำเข้าการตั้งค่าสำเร็จแล้ว');
      } else {
        alert('ไม่สามารถนำเข้าการตั้งค่าได้ กรุณาตรวจสอบไฟล์');
      }
    };
    reader.readAsText(file);
  };

  const labels = tideControlManager.getLocalizedLabels();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            การตั้งค่าการแสดงผล
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportSettings}>
              ส่งออก
            </Button>
            <Button variant="outline" size="sm" onClick={resetSettings}>
              <RotateCcw className="h-4 w-4 mr-1" />
              รีเซ็ต
            </Button>
            {hasChanges && (
              <Button size="sm" onClick={saveSettings}>
                {showSaveSuccess ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    บันทึกแล้ว
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    บันทึก
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          ปรับแต่งวิธีการแสดงข้อมูลน้ำขึ้นน้ำลงตามความต้องการ
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="datum">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="datum" className="flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              ฐานอ้างอิง
            </TabsTrigger>
            <TabsTrigger value="units" className="flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              หน่วยวัด
            </TabsTrigger>
            <TabsTrigger value="timezone" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              เวลา
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              ขั้นสูง
            </TabsTrigger>
          </TabsList>

          <TabsContent value="datum" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="datum">ฐานอ้างอิง</Label>
              <Select
                value={settings.datum}
                onValueChange={(value) => handleSettingChange('datum', value as any)}
              >
                <SelectTrigger id="datum">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MSL">{labels.datum['MSL'].th}</SelectItem>
                  <SelectItem value="CD">{labels.datum['CD'].th}</SelectItem>
                  <SelectItem value="LAT">{labels.datum['LAT'].th}</SelectItem>
                  <SelectItem value="HAT">{labels.datum['HAT'].th}</SelectItem>
                  <SelectItem value="MHHW">{labels.datum['MHHW'].th}</SelectItem>
                  <SelectItem value="MHW">{labels.datum['MHW'].th}</SelectItem>
                  <SelectItem value="MTL">{labels.datum['MTL'].th}</SelectItem>
                  <SelectItem value="MLW">{labels.datum['MLW'].th}</SelectItem>
                  <SelectItem value="MLLW">{labels.datum['MLLW'].th}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.datum === 'LOCAL' && (
              <div className="space-y-2">
                <Label htmlFor="datumOffset">ค่าชดเชย (เมตร)</Label>
                <Input
                  id="datumOffset"
                  type="number"
                  step="0.01"
                  value={settings.datumOffset}
                  onChange={(e) => handleSettingChange('datumOffset', parseFloat(e.target.value) || 0)}
                  className="w-full"
                />
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="confidence-bands">แสดงช่วงความมั่นใจ</Label>
                <p className="text-sm text-muted-foreground">
                  แสดงช่วง 68% และ 95% บนกราฟ
                </p>
              </div>
              <Switch
                id="confidence-bands"
                checked={settings.showConfidenceBands}
                onCheckedChange={(checked) => handleSettingChange('showConfidenceBands', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="flow-arrows">แสดงลูกศรกระแสน้ำ</Label>
                <p className="text-sm text-muted-foreground">
                  แสดงทิศทางและความแรงของกระแสน้ำ
                </p>
              </div>
              <Switch
                id="flow-arrows"
                checked={settings.showFlowArrows}
                onCheckedChange={(checked) => handleSettingChange('showFlowArrows', checked)}
              />
            </div>
          </TabsContent>

          <TabsContent value="units" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height-unit">หน่วยความสูง</Label>
                <Select
                  value={settings.heightUnit}
                  onValueChange={(value) => handleSettingChange('heightUnit', value as any)}
                >
                  <SelectTrigger id="height-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meters">
                      {labels.units.height['meters'].th}
                    </SelectItem>
                    <SelectItem value="feet">
                      {labels.units.height['feet'].th}
                    </SelectItem>
                    <SelectItem value="fathoms">
                      {labels.units.height['fathoms'].th}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="speed-unit">หน่วยความเร็ว</Label>
                <Select
                  value={settings.speedUnit}
                  onValueChange={(value) => handleSettingChange('speedUnit', value as any)}
                >
                  <SelectTrigger id="speed-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m/s">
                      {labels.units.speed['m/s'].th}
                    </SelectItem>
                    <SelectItem value="knots">
                      {labels.units.speed['knots'].th}
                    </SelectItem>
                    <SelectItem value="km/h">
                      {labels.units.speed['km/h'].th}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="distance-unit">หน่วยระยะทาง</Label>
                <Select
                  value={settings.distanceUnit}
                  onValueChange={(value) => handleSettingChange('distanceUnit', value as any)}
                >
                  <SelectTrigger id="distance-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="km">
                      {labels.units.distance['km'].th}
                    </SelectItem>
                    <SelectItem value="nm">
                      {labels.units.distance['nm'].th}
                    </SelectItem>
                    <SelectItem value="miles">
                      {labels.units.distance['miles'].th}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature-unit">หน่วยอุณหภูมิ</Label>
                <Select
                  value={settings.temperatureUnit}
                  onValueChange={(value) => handleSettingChange('temperatureUnit', value as any)}
                >
                  <SelectTrigger id="temperature-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="celsius">
                      {labels.units.temperature['celsius'].th}
                    </SelectItem>
                    <SelectItem value="fahrenheit">
                      {labels.units.temperature['fahrenheit'].th}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="precision">จำนวนทศนิยมที่แสดง</Label>
              <Input
                id="precision"
                type="number"
                min="0"
                max="4"
                step="1"
                value={settings.precision}
                onChange={(e) => handleSettingChange('precision', parseInt(e.target.value) || 2)}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                จำนวนหลักหลังจุดทศนิยม (0-4)
              </p>
            </div>
          </TabsContent>

          <TabsContent value="timezone" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">โซนเวลา</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => handleSettingChange('timezone', value as any)}
              >
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">
                    {labels.timezone['local'].th}
                  </SelectItem>
                  <SelectItem value="thai">
                    {labels.timezone['thai'].th}
                  </SelectItem>
                  <SelectItem value="utc">
                    {labels.timezone['utc'].th}
                  </SelectItem>
                  <SelectItem value="auto">
                    {labels.timezone['auto'].th}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="use-24-hour">ใช้รูปแบบ 24 ชั่วโมง</Label>
                <p className="text-sm text-muted-foreground">
                  แสดงเวลาในรูปแบบ 00:00 แทน AM/PM
                </p>
              </div>
              <Switch
                id="use-24-hour"
                checked={settings.use24Hour}
                onCheckedChange={(checked) => handleSettingChange('use24Hour', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-format">รูปแบบวันที่</Label>
              <Select
                value={settings.dateFormat}
                onValueChange={(value) => handleSettingChange('dateFormat', value as any)}
              >
                <SelectTrigger id="date-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd/mm/yyyy">
                    วัน/เดือน/ปี (dd/mm/yyyy)
                  </SelectItem>
                  <SelectItem value="mm/dd/yyyy">
                    เดือน/วัน/ปี (mm/dd/yyyy)
                  </SelectItem>
                  <SelectItem value="yyyy-mm-dd">
                    ปี-เดือน-วัน (yyyy-mm-dd)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="language">ภาษา</Label>
              <Select
                value={settings.language}
                onValueChange={(value) => handleSettingChange('language', value as any)}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="th">
                    🇹🇭 ภาษาไทย
                  </SelectItem>
                  <SelectItem value="en">
                    🇬🇧 English
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>นำเข้า/ส่งออกการตั้งค่า</Label>
              <div className="flex gap-2">
                <Label
                  htmlFor="import-settings"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    id="import-settings"
                    type="file"
                    accept=".json"
                    onChange={importSettings}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>
                      <Globe className="h-4 w-4 mr-1" />
                      นำเข้า
                    </span>
                  </Button>
                </Label>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
