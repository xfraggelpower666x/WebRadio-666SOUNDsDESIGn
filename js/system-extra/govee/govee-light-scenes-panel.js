import { goveeDevices, goveeControl } from './govee-bridge-client.js?v=govee-cloud-r02';
import { createSceneSender, describeScene, fillScenes, supportsScene } from './govee-light-scenes.js?v=light-scenes-r01';

const panel = document.getElementById('playerLightScenes');
if (panel) {
  const scene = panel.querySelector('select');
  const targets = panel.querySelector('fieldset');
  const status = panel.querySelector('[role=status]');
  const load = panel.querySelector('[data-light-load]');
  const apply = panel.querySelector('[data-light-apply]');
  const sender = createSceneSender(goveeControl);
  let devices = [];
  fillScenes(scene);

  async function run(action) {
    load.disabled = apply.disabled = true;
    try { status.textContent = await action(); }
    catch (error) { status.textContent = error.message; }
    finally { load.disabled = apply.disabled = false; }
  }

  load.addEventListener('click', () => run(async () => {
    const result = await goveeDevices();
    devices = result.devices.filter(supportsScene);
    targets.querySelectorAll('label').forEach(label => label.remove());
    devices.forEach((device, index) => {
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = String(index);
      label.append(checkbox, ' ' + (device.deviceName || device.sku) + ' ');
      targets.append(label);
    });
    sender.reset();
    return devices.length ? devices.length + ' RGB-Geräte gefunden.' : 'Keine RGB-Geräte gefunden.';
  }));

  apply.addEventListener('click', () => run(async () => {
    const selected = [...targets.querySelectorAll('input:checked')].map(input => devices[Number(input.value)]);
    return describeScene(await sender.apply(selected, scene.value));
  }));
}
