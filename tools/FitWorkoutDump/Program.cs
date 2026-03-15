using System.Reflection;
using System.Collections;
using Dynastream.Fit;

string path = args.Length > 0 ? args[0] : @"C:\Users\Kucha\Downloads\ZWIFT_Build_Me_Up\7_4_LOX.fit";
if (!System.IO.File.Exists(path))
{
    Console.WriteLine("File not found: " + path);
    Console.WriteLine("Usage: FitWorkoutDump <path-to-.fit>");
    return 1;
}

var decode = new Decode();
var steps = new List<WorkoutStepMesg>();
var workoutMsgs = new List<WorkoutMesg>();

decode.MesgEvent += (_, e) =>
{
    var mesg = GetMesg(e);
    if (mesg is null) return;
    if (mesg.Num == MesgNum.WorkoutStep)
        steps.Add(new WorkoutStepMesg(mesg));
    else if (mesg.Num == MesgNum.Workout)
        workoutMsgs.Add(new WorkoutMesg(mesg));
};

using var stream = System.IO.File.OpenRead(path);
if (!decode.IsFIT(stream)) { Console.WriteLine("Not a FIT file."); return 1; }
stream.Position = 0;
if (!decode.CheckIntegrity(stream)) { Console.WriteLine("FIT integrity check failed."); return 1; }
stream.Position = 0;
if (!decode.Read(stream)) { Console.WriteLine("Decode failed."); return 1; }

Console.WriteLine($"Workout messages: {workoutMsgs.Count}");
foreach (var w in workoutMsgs)
{
    var m = w as Mesg;
    if (m != null) { Console.WriteLine("--- Workout message ---"); DumpMesgFields(m); }
}
Console.WriteLine($"Workout steps: {steps.Count}\n");

for (int i = 0; i < steps.Count; i++)
{
    var step = steps[i];
    var mesg = step as Mesg ?? throw new InvalidOperationException("WorkoutStepMesg is not Mesg");
    Console.WriteLine($"--- Step {i + 1} ---");
    DumpMesgFields(mesg);
    Console.WriteLine($"  [Getters] GetDurationType={step.GetDurationType()}, GetDurationValue={step.GetDurationValue()}, GetDurationTime={step.GetDurationTime()}");
    Console.WriteLine($"  GetIntensity={step.GetIntensity()} (raw byte: {(byte?)step.GetIntensity()})");
    Console.WriteLine($"  GetTargetType={step.GetTargetType()}, GetTargetValue={step.GetTargetValue()}");
    Console.WriteLine($"  GetCustomTargetPowerLow={step.GetCustomTargetPowerLow()}, GetCustomTargetPowerHigh={step.GetCustomTargetPowerHigh()}");
    Console.WriteLine($"  GetRepeatTime={step.GetRepeatTime()}, GetRepeatSteps={step.GetRepeatSteps()}, GetRepeatPower={step.GetRepeatPower()}");
    Console.WriteLine($"  GetCustomTargetCadenceLow={step.GetCustomTargetCadenceLow()}, GetCustomTargetCadenceHigh={step.GetCustomTargetCadenceHigh()}");
    Console.WriteLine();
}

return 0;

static Mesg? GetMesg(MesgEventArgs e)
{
    var f = typeof(MesgEventArgs).GetField("mesg", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance);
    return f?.GetValue(e) as Mesg;
}

static void DumpMesgFields(Mesg mesg)
{
    var prop = typeof(Mesg).GetProperty("Fields", BindingFlags.Public | BindingFlags.Instance);
    var fields = prop?.GetValue(mesg) as IEnumerable;
    if (fields == null) return;
    foreach (var f in fields)
    {
        if (f == null) continue;
        var name = f.GetType().GetProperty("Name")?.GetValue(f) as string ?? "?";
        var num = f.GetType().GetProperty("Num")?.GetValue(f);
        var getRaw = f.GetType().GetMethod("GetRawValue", [typeof(int)]);
        var raw = getRaw?.Invoke(f, [0]);
        var scale = f.GetType().GetProperty("Scale")?.GetValue(f);
        Console.WriteLine($"  Field Num={num} Name={name} Raw={raw} Scale={scale}");
    }
}
